#![cfg(windows)]

use super::types::{
    DirectInputControlInfo, DirectInputControlSample, DirectInputDeviceInfo,
    DirectInputInventoryDevice,
};
use std::ffi::c_void;
use std::mem::size_of;
use std::ptr::null_mut;
use std::thread;
use std::time::Duration;

use windows::core::{BOOL, Interface, GUID};
use windows::Win32::Devices::HumanInterfaceDevice::{
    DirectInput8Create, DIDEVICEINSTANCEA, DIDEVICEOBJECTINSTANCEA, DIDATAFORMAT,
    DIEDFL_ATTACHEDONLY, DIPH_BYUSAGE, DIPROPHEADER, DIPROPRANGE, DIPROP_RANGE,
    DIJOYSTATE2, DI8DEVCLASS_GAMECTRL, DIDFT_AXIS, DIDFT_BUTTON, DIDFT_POV,
    GUID_RxAxis, GUID_RyAxis, GUID_RzAxis, GUID_Slider, GUID_XAxis, GUID_YAxis,
    GUID_ZAxis, IDirectInput8A, IDirectInputDevice8A,
};
use windows::Win32::Foundation::HINSTANCE;
use windows::Win32::System::LibraryLoader::GetModuleHandleA;

const DI_VERSION: u32 = 0x0800;
const DIENUM_CONTINUE: BOOL = BOOL(1);

extern "C" {
    static c_dfDIJoystick2: DIDATAFORMAT;
}

struct EnumContext {
    devices: Vec<DirectInputDeviceInfo>,
}

unsafe extern "system" fn enum_devices_callback(
    instance: *mut DIDEVICEINSTANCEA,
    context: *mut c_void,
) -> BOOL {
    let context = unsafe { &mut *(context as *mut EnumContext) };
    let instance = unsafe { &*instance };
    let name = c_char_array_to_string(&instance.tszInstanceName);
    let product = c_char_array_to_string(&instance.tszProductName);
    let display_name = if name.is_empty() { product.clone() } else { name.clone() };

    context.devices.push(DirectInputDeviceInfo {
        name: display_name,
        instance_name: name,
        product_name: product,
        instance_guid: guid_text(&instance.guidInstance),
        product_guid: guid_text(&instance.guidProduct),
        enumeration_index: context.devices.len() as i32,
    });

    DIENUM_CONTINUE
}

pub fn list_devices() -> Result<Vec<DirectInputDeviceInfo>, String> {
    unsafe {
        let direct_input = create_direct_input()?;
        let mut context = EnumContext { devices: Vec::new() };
        direct_input
            .EnumDevices(
                DI8DEVCLASS_GAMECTRL,
                Some(enum_devices_callback),
                &mut context as *mut _ as *mut c_void,
                DIEDFL_ATTACHEDONLY,
            )
            .map_err(|err| format!("EnumDevices failed: {err}"))?;
        Ok(context.devices)
    }
}

pub fn list_inventory() -> Result<Vec<DirectInputInventoryDevice>, String> {
    let devices = list_devices()?;
    unsafe {
        let direct_input = create_direct_input()?;
        let mut inventory = Vec::new();
        for info in devices {
            let guid = parse_guid_text(&info.instance_guid)?;
            let mut device = None;
            direct_input
                .CreateDevice(&guid, &mut device, None)
                .map_err(|err| format!("CreateDevice failed for {}: {err}", info.name))?;
            let device = device.ok_or_else(|| format!("CreateDevice returned no device for {}", info.name))?;

            let mut context = ObjectEnumContext { controls: Vec::new() };
            device
                .EnumObjects(
                    Some(enum_objects_callback),
                    &mut context as *mut _ as *mut c_void,
                    0,
                )
                .map_err(|err| format!("EnumObjects failed for {}: {err}", info.name))?;
            context.controls.sort_by(|left, right| {
                left.kind
                    .cmp(&right.kind)
                    .then(left.instance.cmp(&right.instance))
                    .then(left.id.cmp(&right.id))
            });
            inventory.push(DirectInputInventoryDevice {
                name: info.name,
                instance_name: info.instance_name,
                product_name: info.product_name,
                instance_guid: info.instance_guid,
                product_guid: info.product_guid,
                enumeration_index: info.enumeration_index,
                controls: context.controls,
            });
        }
        Ok(inventory)
    }
}

struct ObjectEnumContext {
    controls: Vec<DirectInputControlInfo>,
}

unsafe extern "system" fn enum_objects_callback(
    object: *mut DIDEVICEOBJECTINSTANCEA,
    context: *mut c_void,
) -> BOOL {
    let context = unsafe { &mut *(context as *mut ObjectEnumContext) };
    let object = unsafe { &*object };
    if let Some(control) = control_info_from_object(object) {
        context.controls.push(control);
    }
    DIENUM_CONTINUE
}

fn control_info_from_object(object: &DIDEVICEOBJECTINSTANCEA) -> Option<DirectInputControlInfo> {
    let object_type = object.dwType & 0xff;
    let instance = (object.dwType >> 8) & 0xffff;
    let name = c_char_array_to_string(&object.tszName);

    if object_type & DIDFT_AXIS != 0 {
        let (id, label) = axis_id_and_label(&object.guidType, instance, object.dwOfs)?;
        return Some(DirectInputControlInfo {
            kind: "axis".to_string(),
            id: id.to_string(),
            label: label.to_string(),
            name,
            guid_type: guid_text(&object.guidType),
            offset: object.dwOfs,
            object_type: object.dwType,
            instance,
        });
    }

    if object_type & DIDFT_BUTTON != 0 {
        let id = (instance + 1).to_string();
        return Some(DirectInputControlInfo {
            kind: "button".to_string(),
            id: id.clone(),
            label: format!("Button {id}"),
            name,
            guid_type: guid_text(&object.guidType),
            offset: object.dwOfs,
            object_type: object.dwType,
            instance,
        });
    }

    if object_type == DIDFT_POV {
        let id = instance.to_string();
        return Some(DirectInputControlInfo {
            kind: "pov".to_string(),
            id: id.clone(),
            label: format!("POV {id}"),
            name,
            guid_type: guid_text(&object.guidType),
            offset: object.dwOfs,
            object_type: object.dwType,
            instance,
        });
    }

    None
}

fn axis_id_and_label(guid: &GUID, instance: u32, offset: u32) -> Option<(&'static str, &'static str)> {
    if *guid == GUID_XAxis || offset == 0 {
        return Some(("0x30", "X"));
    }
    if *guid == GUID_YAxis || offset == 4 {
        return Some(("0x31", "Y"));
    }
    if *guid == GUID_ZAxis || offset == 8 {
        return Some(("0x32", "Z"));
    }
    if *guid == GUID_RxAxis || offset == 12 {
        return Some(("0x33", "Rx"));
    }
    if *guid == GUID_RyAxis || offset == 16 {
        return Some(("0x34", "Ry"));
    }
    if *guid == GUID_RzAxis || offset == 20 {
        return Some(("0x35", "Rz"));
    }
    if *guid == GUID_Slider {
        return if instance == 0 || offset == 24 {
            Some(("0x36", "Slider 0"))
        } else {
            Some(("0x37", "Slider 1"))
        };
    }
    if offset == 24 {
        return Some(("0x36", "Slider 0"));
    }
    if offset == 28 {
        return Some(("0x37", "Slider 1"));
    }
    None
}

pub fn sample_controls(instance_guid: String) -> Result<Vec<DirectInputControlSample>, String> {
    let devices = list_devices()?;
    let selected = devices
        .into_iter()
        .find(|device| device.instance_guid.eq_ignore_ascii_case(instance_guid.trim()))
        .ok_or_else(|| format!("DirectInput device not found: {instance_guid}"))?;

    unsafe {
        let direct_input = create_direct_input()?;
        let guid = parse_guid_text(&selected.instance_guid)?;
        let mut device = None;
        direct_input
            .CreateDevice(&guid, &mut device, None)
            .map_err(|err| format!("CreateDevice failed for {}: {err}", selected.name))?;
        let device = device.ok_or_else(|| format!("CreateDevice returned no device for {}", selected.name))?;

        let mut context = ObjectEnumContext { controls: Vec::new() };
        device
            .EnumObjects(
                Some(enum_objects_callback),
                &mut context as *mut _ as *mut c_void,
                0,
            )
            .map_err(|err| format!("EnumObjects failed for {}: {err}", selected.name))?;
        prepare_button_device(&device)?;
        let state = read_state(&device)?;

        context.controls.sort_by(|left, right| {
            left.kind
                .cmp(&right.kind)
                .then(left.instance.cmp(&right.instance))
                .then(left.id.cmp(&right.id))
        });

        Ok(context
            .controls
            .iter()
            .filter_map(|control| sample_control(control, &state))
            .collect())
    }
}

pub(crate) unsafe fn create_direct_input() -> Result<IDirectInput8A, String> {
    let mut direct_input: *mut c_void = null_mut();
    let module = GetModuleHandleA(None)
        .map_err(|err| format!("GetModuleHandleA failed: {err}"))?;
    DirectInput8Create(
        HINSTANCE(module.0),
        DI_VERSION,
        &IDirectInput8A::IID,
        &mut direct_input,
        None,
    )
    .map_err(|err| format!("DirectInput8Create failed: {err}"))?;
    if direct_input.is_null() {
        return Err("DirectInput8Create returned no interface".to_string());
    }
    Ok(IDirectInput8A::from_raw(direct_input))
}

pub(crate) unsafe fn prepare_button_device(device: &IDirectInputDevice8A) -> Result<(), String> {
    device
        .SetDataFormat(&c_dfDIJoystick2 as *const DIDATAFORMAT as *mut DIDATAFORMAT)
        .map_err(|err| format!("SetDataFormat failed: {err}"))?;
    set_standard_axis_ranges(device);
    acquire_and_poll(device)?;
    Ok(())
}

unsafe fn set_standard_axis_ranges(device: &IDirectInputDevice8A) {
    for usage_id in 0x30u32..=0x37u32 {
        let mut range = DIPROPRANGE {
            diph: DIPROPHEADER {
                dwSize: size_of::<DIPROPRANGE>() as u32,
                dwHeaderSize: size_of::<DIPROPHEADER>() as u32,
                dwObj: usage_id,
                dwHow: DIPH_BYUSAGE,
            },
            lMin: 0,
            lMax: 65535,
        };
        let _ = device.SetProperty(&DIPROP_RANGE, &mut range.diph);
    }
}

pub(crate) unsafe fn read_state(device: &IDirectInputDevice8A) -> Result<DIJOYSTATE2, String> {
    let mut state = DIJOYSTATE2::default();
    acquire_and_poll(device)?;
    device
        .GetDeviceState(size_of::<DIJOYSTATE2>() as u32, &mut state as *mut _ as *mut c_void)
        .map_err(|err| format!("GetDeviceState failed: {err}"))?;
    Ok(state)
}

pub(crate) unsafe fn acquire_and_poll(device: &IDirectInputDevice8A) -> Result<(), String> {
    for _ in 0..3 {
        if device.Poll().is_ok() {
            return Ok(());
        }
        if let Err(err) = device.Acquire() {
            let message = err.to_string();
            if !message.contains("Input lost") && !message.contains("Not acquired") {
                return Err(format!("Acquire failed: {err}"));
            }
        }
        thread::sleep(Duration::from_millis(5));
    }

    device
        .Poll()
        .map_err(|err| format!("Poll failed after Acquire: {err}"))
}

pub(crate) fn axis_values(state: &DIJOYSTATE2) -> [i32; 8] {
    [
        state.lX,
        state.lY,
        state.lZ,
        state.lRx,
        state.lRy,
        state.lRz,
        state.rglSlider[0],
        state.rglSlider[1],
    ]
}

fn sample_control(control: &DirectInputControlInfo, state: &DIJOYSTATE2) -> Option<DirectInputControlSample> {
    let (value, normalized) = match control.kind.as_str() {
        "axis" => {
            let value = axis_value_by_usage_id(state, &control.id)?;
            (value, (value as f32 / 65535.0).clamp(0.0, 1.0))
        }
        "button" => {
            let index = control.id.parse::<usize>().ok()?.checked_sub(1)?;
            let pressed = state.rgbButtons.get(index).copied().unwrap_or_default() & 0x80 != 0;
            (if pressed { 1 } else { 0 }, if pressed { 1.0 } else { 0.0 })
        }
        "pov" => {
            let index = control.id.parse::<usize>().ok()?;
            let value = state.rgdwPOV.get(index).copied().unwrap_or(0xffff_ffff) as i32;
            (value, if value == -1 { 0.0 } else { 1.0 })
        }
        _ => return None,
    };

    Some(DirectInputControlSample {
        kind: control.kind.clone(),
        id: control.id.clone(),
        label: control.label.clone(),
        name: control.name.clone(),
        guid_type: control.guid_type.clone(),
        offset: control.offset,
        object_type: control.object_type,
        instance: control.instance,
        value,
        normalized,
    })
}

fn axis_value_by_usage_id(state: &DIJOYSTATE2, usage_id: &str) -> Option<i32> {
    axis_index_from_usage_id(usage_id).map(|index| axis_values(state)[index])
}

pub(crate) fn axis_index_from_usage_id(usage_id: &str) -> Option<usize> {
    match usage_id.trim().to_ascii_lowercase().as_str() {
        "0x30" => Some(0),
        "0x31" => Some(1),
        "0x32" => Some(2),
        "0x33" => Some(3),
        "0x34" => Some(4),
        "0x35" => Some(5),
        "0x36" => Some(6),
        "0x37" => Some(7),
        _ => None,
    }
}

pub(crate) fn c_char_array_to_string(chars: &[i8]) -> String {
    let bytes: Vec<u8> = chars
        .iter()
        .take_while(|ch| **ch != 0)
        .map(|ch| *ch as u8)
        .collect();
    String::from_utf8_lossy(&bytes).trim().to_string()
}

pub(crate) fn guid_text(guid: &GUID) -> String {
    format!(
        "{:08x}-{:04x}-{:04x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
        guid.data1,
        guid.data2,
        guid.data3,
        guid.data4[0],
        guid.data4[1],
        guid.data4[2],
        guid.data4[3],
        guid.data4[4],
        guid.data4[5],
        guid.data4[6],
        guid.data4[7]
    )
}

pub(crate) fn parse_guid_text(text: &str) -> Result<GUID, String> {
    let compact = text.replace('-', "");
    if compact.len() != 32 {
        return Err(format!("Invalid GUID: {text}"));
    }

    let data1 = u32::from_str_radix(&compact[0..8], 16)
        .map_err(|_| format!("Invalid GUID: {text}"))?;
    let data2 = u16::from_str_radix(&compact[8..12], 16)
        .map_err(|_| format!("Invalid GUID: {text}"))?;
    let data3 = u16::from_str_radix(&compact[12..16], 16)
        .map_err(|_| format!("Invalid GUID: {text}"))?;
    let mut data4 = [0u8; 8];
    for index in 0..8 {
        let start = 16 + index * 2;
        data4[index] = u8::from_str_radix(&compact[start..start + 2], 16)
            .map_err(|_| format!("Invalid GUID: {text}"))?;
    }

    Ok(GUID {
        data1,
        data2,
        data3,
        data4,
    })
}
