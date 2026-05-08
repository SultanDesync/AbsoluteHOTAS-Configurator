use std::fs;
use std::path::Path;
use std::thread;
use std::time::Duration;

use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct ShipOutput {
    kind: String,
    code: u16,
    #[serde(default)]
    extended: bool,
}

#[derive(Clone, Serialize)]
struct DirectInputDeviceInfo {
    name: String,
    instance_name: String,
    product_name: String,
    instance_guid: String,
    product_guid: String,
    enumeration_index: i32,
}

#[derive(Clone, Serialize)]
struct DirectInputControlInfo {
    kind: String,
    id: String,
    label: String,
    name: String,
    guid_type: String,
    offset: u32,
    object_type: u32,
    instance: u32,
}

#[derive(Clone, Serialize)]
struct DirectInputInventoryDevice {
    name: String,
    instance_name: String,
    product_name: String,
    instance_guid: String,
    product_guid: String,
    enumeration_index: i32,
    controls: Vec<DirectInputControlInfo>,
}

#[derive(Clone, Serialize)]
struct DirectInputControlSample {
    kind: String,
    id: String,
    label: String,
    name: String,
    guid_type: String,
    offset: u32,
    object_type: u32,
    instance: u32,
    value: i32,
    normalized: f32,
}

#[derive(Serialize)]
struct RecordedControl {
    device_name: String,
    instance_guid: String,
    product_guid: String,
    enumeration_index: i32,
    kind: String,
    id: String,
    label: String,
}

#[derive(Serialize)]
struct RecordedButton {
    device_name: String,
    enumeration_index: i32,
    button_id: i32,
}

#[derive(Serialize)]
struct RecordedAxis {
    device_name: String,
    enumeration_index: i32,
    usage_id: String,
}

#[tauri::command]
fn default_ini_path() -> String {
    r"Data\SFSE\Plugins\AbsoluteHOTAS.ini".to_string()
}

#[tauri::command]
fn read_ini(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|err| format!("{} ({})", err, path))
}

#[tauri::command]
fn write_ini(path: String, contents: String) -> Result<(), String> {
    let path_ref = Path::new(&path);
    if let Some(parent) = path_ref.parent() {
        fs::create_dir_all(parent).map_err(|err| format!("{} ({})", err, parent.display()))?;
    }

    fs::write(path_ref, contents).map_err(|err| format!("{} ({})", err, path_ref.display()))
}

#[tauri::command]
fn emit_ship_output(output: ShipOutput, mode: String) -> Result<(), String> {
    emit_output_for_preview(&output, &mode)
}

#[tauri::command]
fn list_directinput_devices() -> Result<Vec<DirectInputDeviceInfo>, String> {
    list_directinput_devices_impl()
}

#[tauri::command]
fn list_directinput_inventory() -> Result<Vec<DirectInputInventoryDevice>, String> {
    list_directinput_inventory_impl()
}

#[tauri::command]
fn sample_directinput_controls(instance_guid: String) -> Result<Vec<DirectInputControlSample>, String> {
    sample_directinput_controls_impl(instance_guid)
}

#[tauri::command]
fn record_directinput_control(
    instance_guid: String,
    allowed_kinds: Vec<String>,
    timeout_ms: u32,
) -> Result<RecordedControl, String> {
    record_directinput_control_impl(instance_guid, allowed_kinds, timeout_ms)
}

#[tauri::command]
fn record_directinput_button(
    device_name: String,
    device_index: i32,
    timeout_ms: u32,
) -> Result<RecordedButton, String> {
    record_directinput_button_impl(device_name, device_index, timeout_ms)
}

#[tauri::command]
fn record_directinput_button_from_devices(
    device_indices: Vec<i32>,
    timeout_ms: u32,
) -> Result<RecordedButton, String> {
    record_directinput_button_from_devices_impl(device_indices, timeout_ms)
}

#[tauri::command]
fn record_directinput_axis_from_devices(
    device_indices: Vec<i32>,
    timeout_ms: u32,
    preferred_usage_id: Option<String>,
) -> Result<RecordedAxis, String> {
    record_directinput_axis_from_devices_impl(device_indices, timeout_ms, preferred_usage_id)
}

#[cfg(windows)]
fn emit_output_for_preview(output: &ShipOutput, mode: &str) -> Result<(), String> {
    send_output(output, false)?;

    let dwell_ms = if mode.eq_ignore_ascii_case("hold") { 90 } else { 35 };
    thread::sleep(Duration::from_millis(dwell_ms));

    send_output(output, true)
}

#[cfg(not(windows))]
fn emit_output_for_preview(_output: &ShipOutput, _mode: &str) -> Result<(), String> {
    Err("Direct input emission is only available on Windows".to_string())
}

#[cfg(not(windows))]
fn list_directinput_devices_impl() -> Result<Vec<DirectInputDeviceInfo>, String> {
    Err("DirectInput device enumeration is only available on Windows".to_string())
}

#[cfg(not(windows))]
fn list_directinput_inventory_impl() -> Result<Vec<DirectInputInventoryDevice>, String> {
    Err("DirectInput inventory is only available on Windows".to_string())
}

#[cfg(not(windows))]
fn sample_directinput_controls_impl(_instance_guid: String) -> Result<Vec<DirectInputControlSample>, String> {
    Err("DirectInput sampling is only available on Windows".to_string())
}

#[cfg(not(windows))]
fn record_directinput_control_impl(
    _instance_guid: String,
    _allowed_kinds: Vec<String>,
    _timeout_ms: u32,
) -> Result<RecordedControl, String> {
    Err("DirectInput recording is only available on Windows".to_string())
}

#[cfg(not(windows))]
fn record_directinput_button_impl(
    _device_name: String,
    _device_index: i32,
    _timeout_ms: u32,
) -> Result<RecordedButton, String> {
    Err("DirectInput button recording is only available on Windows".to_string())
}

#[cfg(not(windows))]
fn record_directinput_button_from_devices_impl(
    _device_indices: Vec<i32>,
    _timeout_ms: u32,
) -> Result<RecordedButton, String> {
    Err("DirectInput button recording is only available on Windows".to_string())
}

#[cfg(not(windows))]
fn record_directinput_axis_from_devices_impl(
    _device_indices: Vec<i32>,
    _timeout_ms: u32,
    _preferred_usage_id: Option<String>,
) -> Result<RecordedAxis, String> {
    Err("DirectInput axis recording is only available on Windows".to_string())
}

#[cfg(windows)]
fn send_output(output: &ShipOutput, key_up: bool) -> Result<(), String> {
    match output.kind.as_str() {
        "keyboard" => send_keyboard_scan_code(output.code, output.extended, key_up),
        "mouse" => send_mouse_button(output.code, key_up),
        other => Err(format!("Unsupported output kind: {other}")),
    }
}

#[cfg(windows)]
#[allow(non_snake_case)]
mod win_input {
    use std::ffi::c_int;

    pub const INPUT_MOUSE: u32 = 0;
    pub const INPUT_KEYBOARD: u32 = 1;
    pub const KEYEVENTF_EXTENDEDKEY: u32 = 0x0001;
    pub const KEYEVENTF_KEYUP: u32 = 0x0002;
    pub const KEYEVENTF_SCANCODE: u32 = 0x0008;
    pub const MOUSEEVENTF_LEFTDOWN: u32 = 0x0002;
    pub const MOUSEEVENTF_LEFTUP: u32 = 0x0004;
    pub const MOUSEEVENTF_RIGHTDOWN: u32 = 0x0008;
    pub const MOUSEEVENTF_RIGHTUP: u32 = 0x0010;
    pub const MOUSEEVENTF_MIDDLEDOWN: u32 = 0x0020;
    pub const MOUSEEVENTF_MIDDLEUP: u32 = 0x0040;
    pub const MOUSEEVENTF_XDOWN: u32 = 0x0080;
    pub const MOUSEEVENTF_XUP: u32 = 0x0100;
    pub const XBUTTON1: u32 = 0x0001;

    #[repr(C)]
    #[derive(Copy, Clone)]
    pub struct MOUSEINPUT {
        pub dx: i32,
        pub dy: i32,
        pub mouseData: u32,
        pub dwFlags: u32,
        pub time: u32,
        pub dwExtraInfo: usize,
    }

    #[repr(C)]
    #[derive(Copy, Clone)]
    pub struct KEYBDINPUT {
        pub wVk: u16,
        pub wScan: u16,
        pub dwFlags: u32,
        pub time: u32,
        pub dwExtraInfo: usize,
    }

    #[repr(C)]
    #[derive(Copy, Clone)]
    pub struct HARDWAREINPUT {
        pub uMsg: u32,
        pub wParamL: u16,
        pub wParamH: u16,
    }

    #[repr(C)]
    #[derive(Copy, Clone)]
    pub union INPUTUNION {
        pub mi: MOUSEINPUT,
        pub ki: KEYBDINPUT,
        pub hi: HARDWAREINPUT,
    }

    #[repr(C)]
    #[derive(Copy, Clone)]
    pub struct INPUT {
        pub r#type: u32,
        pub u: INPUTUNION,
    }

    extern "system" {
        pub fn SendInput(cInputs: u32, pInputs: *const INPUT, cbSize: c_int) -> u32;
    }
}

#[cfg(windows)]
mod direct_input {
    use super::{
        DirectInputControlInfo, DirectInputControlSample, DirectInputDeviceInfo,
        DirectInputInventoryDevice, RecordedAxis, RecordedButton, RecordedControl,
    };
    use std::ffi::c_void;
    use std::mem::size_of;
    use std::ptr::null_mut;
    use std::thread;
    use std::time::{Duration, Instant};

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

    pub fn record_button(
        device_name: String,
        device_index: i32,
        timeout_ms: u32,
    ) -> Result<RecordedButton, String> {
        let devices = list_devices()?;
        let selected = select_device(&devices, &device_name, device_index)
            .ok_or_else(|| format!("DirectInput device not found: '{device_name}' index {device_index}"))?;
        let guid = parse_guid_text(&selected.instance_guid)?;

        unsafe {
            let direct_input = create_direct_input()?;
            let mut device = None;
            direct_input
                .CreateDevice(&guid, &mut device, None)
                .map_err(|err| format!("CreateDevice failed: {err}"))?;
            let device = device.ok_or_else(|| "CreateDevice returned no device".to_string())?;

            prepare_button_device(&device)?;
            wait_for_recorded_button(&device, &selected, timeout_ms)
        }
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

    pub fn record_button_from_devices(
        device_indices: Vec<i32>,
        timeout_ms: u32,
    ) -> Result<RecordedButton, String> {
        let recorders = open_recorders(device_indices)?;
        unsafe { wait_for_recorded_button_multi(&recorders, timeout_ms) }
    }

    pub fn record_axis_from_devices(
        device_indices: Vec<i32>,
        timeout_ms: u32,
        preferred_usage_id: Option<String>,
    ) -> Result<RecordedAxis, String> {
        let recorders = open_recorders(device_indices)?;
        let preferred_axis = preferred_usage_id
            .as_deref()
            .and_then(axis_index_from_usage_id);
        unsafe { wait_for_recorded_axis_multi(&recorders, timeout_ms, preferred_axis) }
    }

    pub fn record_control(
        instance_guid: String,
        allowed_kinds: Vec<String>,
        timeout_ms: u32,
    ) -> Result<RecordedControl, String> {
        let allowed: Vec<String> = allowed_kinds
            .into_iter()
            .map(|kind| kind.to_ascii_lowercase())
            .collect();
        let devices = list_devices()?;
        let info = devices
            .into_iter()
            .find(|device| device.instance_guid.eq_ignore_ascii_case(instance_guid.trim()))
            .ok_or_else(|| format!("DirectInput device not found: {instance_guid}"))?;

        unsafe {
            let direct_input = create_direct_input()?;
            let guid = parse_guid_text(&info.instance_guid)?;
            let mut device = None;
            direct_input
                .CreateDevice(&guid, &mut device, None)
                .map_err(|err| format!("CreateDevice failed for {}: {err}", info.name))?;
            let device = device.ok_or_else(|| format!("CreateDevice returned no device for {}", info.name))?;
            prepare_button_device(&device)?;

            if allowed.iter().any(|kind| kind == "button") {
                if let Ok(button) = wait_for_recorded_button(&device, &info, timeout_ms) {
                    return Ok(RecordedControl {
                        device_name: info.name,
                        instance_guid: info.instance_guid,
                        product_guid: info.product_guid,
                        enumeration_index: info.enumeration_index,
                        kind: "button".to_string(),
                        id: button.button_id.to_string(),
                        label: format!("Button {}", button.button_id),
                    });
                }
            }

            if allowed.iter().any(|kind| kind == "axis") {
                let instance_guid = info.instance_guid.clone();
                let product_guid = info.product_guid.clone();
                let recorder = DeviceRecorder { info, device };
                let axis = wait_for_recorded_axis_multi(&[recorder], timeout_ms, None)?;
                return Ok(RecordedControl {
                    device_name: axis.device_name,
                    instance_guid,
                    product_guid,
                    enumeration_index: axis.enumeration_index,
                    kind: "axis".to_string(),
                    label: axis.usage_id.clone(),
                    id: axis.usage_id,
                });
            }
        }

        Err("No supported DirectInput control kind selected for recording".to_string())
    }

    struct DeviceRecorder {
        info: DirectInputDeviceInfo,
        device: IDirectInputDevice8A,
    }

    fn open_recorders(device_indices: Vec<i32>) -> Result<Vec<DeviceRecorder>, String> {
        let devices = list_devices()?;
        if device_indices.is_empty() {
            return Err("No DirectInput devices selected for recording".to_string());
        }

        let selected_infos: Vec<DirectInputDeviceInfo> = devices
            .into_iter()
            .filter(|device| device_indices.contains(&device.enumeration_index))
            .collect();

        if selected_infos.is_empty() {
            return Err("No DirectInput devices selected for recording".to_string());
        }

        unsafe {
            let direct_input = create_direct_input()?;
            let mut recorders = Vec::new();
            for info in selected_infos {
                let guid = parse_guid_text(&info.instance_guid)?;
                let mut device = None;
                direct_input
                    .CreateDevice(&guid, &mut device, None)
                    .map_err(|err| format!("CreateDevice failed for {}: {err}", info.name))?;
                let device = device.ok_or_else(|| format!("CreateDevice returned no device for {}", info.name))?;
                prepare_button_device(&device)?;
                recorders.push(DeviceRecorder { info, device });
            }
            Ok(recorders)
        }
    }

    unsafe fn create_direct_input() -> Result<IDirectInput8A, String> {
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

    unsafe fn prepare_button_device(device: &IDirectInputDevice8A) -> Result<(), String> {
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

    unsafe fn wait_for_recorded_button(
        device: &IDirectInputDevice8A,
        selected: &DirectInputDeviceInfo,
        timeout_ms: u32,
    ) -> Result<RecordedButton, String> {
        let deadline = Instant::now() + Duration::from_millis(timeout_ms.max(500) as u64);
        let mut previous_mask = button_mask(&read_state(device)?);

        while Instant::now() < deadline {
            let state = read_state(device)?;
            let current_mask = button_mask(&state);
            if let Some(button_index) = first_new_pressed_button(current_mask, previous_mask) {
                return Ok(RecordedButton {
                    device_name: selected.name.clone(),
                    enumeration_index: selected.enumeration_index,
                    button_id: button_index as i32 + 1,
                });
            }
            previous_mask = current_mask;

            thread::sleep(Duration::from_millis(16));
        }

        Err("Timed out waiting for a DirectInput button press".to_string())
    }

    unsafe fn wait_for_recorded_button_multi(
        recorders: &[DeviceRecorder],
        timeout_ms: u32,
    ) -> Result<RecordedButton, String> {
        let deadline = Instant::now() + Duration::from_millis(timeout_ms.max(500) as u64);
        let mut previous_masks = recorders
            .iter()
            .map(|recorder| read_state(&recorder.device).map(|state| button_mask(&state)))
            .collect::<Result<Vec<_>, _>>()?;

        while Instant::now() < deadline {
            for (index, recorder) in recorders.iter().enumerate() {
                let state = read_state(&recorder.device)?;
                let current_mask = button_mask(&state);
                if let Some(button_index) = first_new_pressed_button(current_mask, previous_masks[index]) {
                    return Ok(RecordedButton {
                        device_name: recorder.info.name.clone(),
                        enumeration_index: recorder.info.enumeration_index,
                        button_id: button_index as i32 + 1,
                    });
                }
                previous_masks[index] = current_mask;
            }

            thread::sleep(Duration::from_millis(16));
        }

        Err("Timed out waiting for a DirectInput button press".to_string())
    }

    unsafe fn wait_for_recorded_axis_multi(
        recorders: &[DeviceRecorder],
        timeout_ms: u32,
        preferred_axis: Option<usize>,
    ) -> Result<RecordedAxis, String> {
        let timeout = timeout_ms.max(1000) as u64;
        let arming_ms = 250u64.min(timeout.saturating_sub(250));
        let arming_deadline = Instant::now() + Duration::from_millis(arming_ms);
        let mut baselines: Vec<AxisBaseline> = recorders
            .iter()
            .map(|recorder| read_state(&recorder.device).map(|state| AxisBaseline::new(&state)))
            .collect::<Result<Vec<_>, _>>()?;

        while Instant::now() < arming_deadline {
            for (index, recorder) in recorders.iter().enumerate() {
                let state = read_state(&recorder.device)?;
                baselines[index].observe_noise(&state);
            }
            thread::sleep(Duration::from_millis(16));
        }

        let deadline = Instant::now() + Duration::from_millis(timeout.saturating_sub(arming_ms));
        let capture_start = Instant::now();
        let mut captures: Vec<AxisCapture> = baselines
            .iter()
            .map(AxisCapture::from_baseline)
            .collect();
        let mut best_seen: Option<AxisCandidate> = None;
        let mut best_runner_up: Option<AxisCandidate> = None;

        while Instant::now() < deadline {
            for (index, recorder) in recorders.iter().enumerate() {
                let state = read_state(&recorder.device)?;
                captures[index].observe(&state);
            }

            let (best, runner_up) = strongest_axis_candidate(&baselines, &captures, preferred_axis);
            best_seen = strongest_optional(best_seen, best.clone());
            best_runner_up = strongest_optional(best_runner_up, runner_up.clone());

            if let Some(candidate) = best {
                if capture_start.elapsed() >= Duration::from_millis(900)
                    && candidate.score >= early_accept_threshold(&runner_up)
                {
                    let recorder = &recorders[candidate.recorder_index];
                    return Ok(RecordedAxis {
                        device_name: recorder.info.name.clone(),
                        enumeration_index: recorder.info.enumeration_index,
                        usage_id: axis_usage_id(candidate.axis_index).to_string(),
                    });
                }
            }

            thread::sleep(Duration::from_millis(16));
        }

        if let Some(candidate) = best_seen {
            if candidate.score >= final_accept_threshold(&best_runner_up) {
                let recorder = &recorders[candidate.recorder_index];
                return Ok(RecordedAxis {
                    device_name: recorder.info.name.clone(),
                    enumeration_index: recorder.info.enumeration_index,
                    usage_id: axis_usage_id(candidate.axis_index).to_string(),
                });
            }
            if let Some(runner_up) = best_runner_up {
                return Err(format!(
                    "Ambiguous axis movement: {} {} and {} {} both moved. Try selecting only one recording source.",
                    recorders[candidate.recorder_index].info.name,
                    axis_usage_id(candidate.axis_index),
                    recorders[runner_up.recorder_index].info.name,
                    axis_usage_id(runner_up.axis_index)
                ));
            }
        }

        if let Some(axis_index) = preferred_axis {
            return Err(format!(
                "Timed out waiting for DirectInput {} movement. Change the row axis dropdown if this control reports as a different axis.",
                axis_usage_id(axis_index)
            ));
        }

        Err("Timed out waiting for DirectInput axis movement".to_string())
    }

    unsafe fn read_state(device: &IDirectInputDevice8A) -> Result<DIJOYSTATE2, String> {
        let mut state = DIJOYSTATE2::default();
        acquire_and_poll(device)?;
        device
            .GetDeviceState(size_of::<DIJOYSTATE2>() as u32, &mut state as *mut _ as *mut c_void)
            .map_err(|err| format!("GetDeviceState failed: {err}"))?;
        Ok(state)
    }

    unsafe fn acquire_and_poll(device: &IDirectInputDevice8A) -> Result<(), String> {
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

    fn button_mask(state: &DIJOYSTATE2) -> [u64; 2] {
        let mut mask = [0u64; 2];
        for (index, button) in state.rgbButtons.iter().enumerate() {
            if button & 0x80 != 0 {
                mask[index / 64] |= 1u64 << (index % 64);
            }
        }
        mask
    }

    fn first_new_pressed_button(current_mask: [u64; 2], previous_mask: [u64; 2]) -> Option<usize> {
        let pressed = [
            current_mask[0] & !previous_mask[0],
            current_mask[1] & !previous_mask[1],
        ];
        for (segment, mask) in pressed.iter().enumerate() {
            if *mask != 0 {
                return Some(segment * 64 + mask.trailing_zeros() as usize);
            }
        }
        None
    }

    #[derive(Clone)]
    struct AxisBaseline {
        center: [i32; 8],
        min: [i32; 8],
        max: [i32; 8],
    }

    impl AxisBaseline {
        fn new(state: &DIJOYSTATE2) -> Self {
            let values = axis_values(state);
            Self {
                center: values,
                min: values,
                max: values,
            }
        }

        fn observe_noise(&mut self, state: &DIJOYSTATE2) {
            let values = axis_values(state);
            for (index, value) in values.iter().enumerate() {
                self.min[index] = self.min[index].min(*value);
                self.max[index] = self.max[index].max(*value);
            }
        }

        fn noise_span(&self, index: usize) -> i32 {
            self.max[index].saturating_sub(self.min[index]).abs()
        }
    }

    #[derive(Clone)]
    struct AxisCapture {
        min: [i32; 8],
        max: [i32; 8],
    }

    impl AxisCapture {
        fn from_baseline(baseline: &AxisBaseline) -> Self {
            Self {
                min: baseline.center,
                max: baseline.center,
            }
        }

        fn observe(&mut self, state: &DIJOYSTATE2) {
            let values = axis_values(state);
            for (index, value) in values.iter().enumerate() {
                self.min[index] = self.min[index].min(*value);
                self.max[index] = self.max[index].max(*value);
            }
        }

        fn span(&self, index: usize) -> i32 {
            self.max[index].saturating_sub(self.min[index]).abs()
        }
    }

    #[derive(Clone)]
    struct AxisCandidate {
        recorder_index: usize,
        axis_index: usize,
        score: i32,
    }

    fn axis_values(state: &DIJOYSTATE2) -> [i32; 8] {
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

    fn strongest_axis_candidate(
        baselines: &[AxisBaseline],
        captures: &[AxisCapture],
        preferred_axis: Option<usize>,
    ) -> (Option<AxisCandidate>, Option<AxisCandidate>) {
        const MIN_THRESHOLD: i32 = 5000;
        const NOISE_MARGIN: i32 = 1800;
        let mut candidates: Vec<AxisCandidate> = Vec::new();

        for (recorder_index, capture) in captures.iter().enumerate() {
            for axis_index in 0..8 {
                if preferred_axis.is_some_and(|preferred| preferred != axis_index) {
                    continue;
                }
                let noise = baselines[recorder_index].noise_span(axis_index);
                let threshold = MIN_THRESHOLD.max(noise * 4 + NOISE_MARGIN);
                let score = capture.span(axis_index).saturating_sub(noise);
                if score >= threshold {
                    candidates.push(AxisCandidate {
                        recorder_index,
                        axis_index,
                        score,
                    });
                }
            }
        }

        candidates.sort_by(|left, right| right.score.cmp(&left.score));
        (candidates.get(0).cloned(), candidates.get(1).cloned())
    }

    fn strongest_optional(left: Option<AxisCandidate>, right: Option<AxisCandidate>) -> Option<AxisCandidate> {
        match (left, right) {
            (Some(left), Some(right)) => Some(if left.score >= right.score { left } else { right }),
            (Some(left), None) => Some(left),
            (None, Some(right)) => Some(right),
            (None, None) => None,
        }
    }

    fn early_accept_threshold(runner_up: &Option<AxisCandidate>) -> i32 {
        match runner_up {
            Some(runner_up) => ((runner_up.score as f32) * 1.65) as i32,
            None => 18_000,
        }
    }

    fn final_accept_threshold(runner_up: &Option<AxisCandidate>) -> i32 {
        match runner_up {
            Some(runner_up) => ((runner_up.score as f32) * 1.25) as i32,
            None => 5_000,
        }
    }

    fn axis_usage_id(index: usize) -> &'static str {
        match index {
            0 => "0x30",
            1 => "0x31",
            2 => "0x32",
            3 => "0x33",
            4 => "0x34",
            5 => "0x35",
            6 => "0x36",
            7 => "0x37",
            _ => "0x30",
        }
    }

    fn axis_index_from_usage_id(usage_id: &str) -> Option<usize> {
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

    fn select_device(
        devices: &[DirectInputDeviceInfo],
        name: &str,
        index: i32,
    ) -> Option<DirectInputDeviceInfo> {
        let trimmed = name.trim().to_lowercase();
        if !trimmed.is_empty() {
            if let Some(device) = devices
                .iter()
                .find(|device| device.name.to_lowercase().contains(&trimmed))
            {
                return Some(device.clone());
            }
        }

        devices
            .iter()
            .find(|device| device.enumeration_index == index)
            .cloned()
    }

    fn c_char_array_to_string(chars: &[i8]) -> String {
        let bytes: Vec<u8> = chars
            .iter()
            .take_while(|ch| **ch != 0)
            .map(|ch| *ch as u8)
            .collect();
        String::from_utf8_lossy(&bytes).trim().to_string()
    }

    fn guid_text(guid: &GUID) -> String {
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

    fn parse_guid_text(text: &str) -> Result<GUID, String> {
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
}

#[cfg(windows)]
fn list_directinput_devices_impl() -> Result<Vec<DirectInputDeviceInfo>, String> {
    direct_input::list_devices()
}

#[cfg(windows)]
fn list_directinput_inventory_impl() -> Result<Vec<DirectInputInventoryDevice>, String> {
    direct_input::list_inventory()
}

#[cfg(windows)]
fn sample_directinput_controls_impl(instance_guid: String) -> Result<Vec<DirectInputControlSample>, String> {
    direct_input::sample_controls(instance_guid)
}

#[cfg(windows)]
fn record_directinput_control_impl(
    instance_guid: String,
    allowed_kinds: Vec<String>,
    timeout_ms: u32,
) -> Result<RecordedControl, String> {
    direct_input::record_control(instance_guid, allowed_kinds, timeout_ms)
}

#[cfg(windows)]
fn record_directinput_button_impl(
    device_name: String,
    device_index: i32,
    timeout_ms: u32,
) -> Result<RecordedButton, String> {
    direct_input::record_button(device_name, device_index, timeout_ms)
}

#[cfg(windows)]
fn record_directinput_button_from_devices_impl(
    device_indices: Vec<i32>,
    timeout_ms: u32,
) -> Result<RecordedButton, String> {
    direct_input::record_button_from_devices(device_indices, timeout_ms)
}

#[cfg(windows)]
fn record_directinput_axis_from_devices_impl(
    device_indices: Vec<i32>,
    timeout_ms: u32,
    preferred_usage_id: Option<String>,
) -> Result<RecordedAxis, String> {
    direct_input::record_axis_from_devices(device_indices, timeout_ms, preferred_usage_id)
}

#[cfg(windows)]
fn send_keyboard_scan_code(scan_code: u16, extended: bool, key_up: bool) -> Result<(), String> {
    use win_input::*;

    let mut flags = KEYEVENTF_SCANCODE;
    if extended {
        flags |= KEYEVENTF_EXTENDEDKEY;
    }
    if key_up {
        flags |= KEYEVENTF_KEYUP;
    }

    let input = INPUT {
        r#type: INPUT_KEYBOARD,
        u: INPUTUNION {
            ki: KEYBDINPUT {
                wVk: 0,
                wScan: scan_code,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };

    send_input(input)
}

#[cfg(windows)]
fn send_mouse_button(button: u16, key_up: bool) -> Result<(), String> {
    use win_input::*;

    let (flags, data) = match (button, key_up) {
        (1, false) => (MOUSEEVENTF_LEFTDOWN, 0),
        (1, true) => (MOUSEEVENTF_LEFTUP, 0),
        (2, false) => (MOUSEEVENTF_RIGHTDOWN, 0),
        (2, true) => (MOUSEEVENTF_RIGHTUP, 0),
        (3, false) => (MOUSEEVENTF_MIDDLEDOWN, 0),
        (3, true) => (MOUSEEVENTF_MIDDLEUP, 0),
        (4, false) => (MOUSEEVENTF_XDOWN, XBUTTON1),
        (4, true) => (MOUSEEVENTF_XUP, XBUTTON1),
        _ => return Err(format!("Unsupported mouse button: {button}")),
    };

    let input = INPUT {
        r#type: INPUT_MOUSE,
        u: INPUTUNION {
            mi: MOUSEINPUT {
                dx: 0,
                dy: 0,
                mouseData: data,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };

    send_input(input)
}

#[cfg(windows)]
fn send_input(input: win_input::INPUT) -> Result<(), String> {
    let sent = unsafe {
        win_input::SendInput(
            1,
            &input,
            std::mem::size_of::<win_input::INPUT>() as i32,
        )
    };

    if sent == 1 {
        Ok(())
    } else {
        Err("SendInput returned 0".to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            default_ini_path,
            read_ini,
            write_ini,
            emit_ship_output,
            list_directinput_devices,
            list_directinput_inventory,
            sample_directinput_controls,
            record_directinput_control,
            record_directinput_button,
            record_directinput_button_from_devices,
            record_directinput_axis_from_devices
        ])
        .run(tauri::generate_context!())
        .expect("error while running AbsoluteHOTAS Configurator");
}
