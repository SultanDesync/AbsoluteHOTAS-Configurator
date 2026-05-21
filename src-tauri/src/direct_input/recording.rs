#![cfg(windows)]

use super::types::{RecordedAxis, RecordedButton, RecordedControl, DirectInputDeviceInfo};
use super::devices::{
    create_direct_input, prepare_button_device, read_state, axis_values,
    axis_index_from_usage_id, parse_guid_text, list_devices,
};
use std::thread;
use std::time::{Duration, Instant};

use windows::Win32::Devices::HumanInterfaceDevice::{DIJOYSTATE2, IDirectInputDevice8A};

struct DeviceRecorder {
    info: DirectInputDeviceInfo,
    device: IDirectInputDevice8A,
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
