pub mod types;

#[cfg(windows)]
pub mod devices;
#[cfg(windows)]
pub mod recording;

use types::{
    DirectInputControlSample, DirectInputDeviceInfo, DirectInputInventoryDevice,
    RecordedAxis, RecordedButton, RecordedControl,
};

#[tauri::command]
pub fn list_directinput_devices() -> Result<Vec<DirectInputDeviceInfo>, String> {
    #[cfg(windows)]
    {
        devices::list_devices()
    }
    #[cfg(not(windows))]
    {
        Err("DirectInput device enumeration is only available on Windows".to_string())
    }
}

#[tauri::command]
pub fn list_directinput_inventory() -> Result<Vec<DirectInputInventoryDevice>, String> {
    #[cfg(windows)]
    {
        devices::list_inventory()
    }
    #[cfg(not(windows))]
    {
        Err("DirectInput inventory is only available on Windows".to_string())
    }
}

#[tauri::command]
pub fn sample_directinput_controls(instance_guid: String) -> Result<Vec<DirectInputControlSample>, String> {
    #[cfg(windows)]
    {
        devices::sample_controls(instance_guid)
    }
    #[cfg(not(windows))]
    {
        Err("DirectInput sampling is only available on Windows".to_string())
    }
}

#[tauri::command]
pub fn record_directinput_control(
    instance_guid: String,
    allowed_kinds: Vec<String>,
    timeout_ms: u32,
) -> Result<RecordedControl, String> {
    #[cfg(windows)]
    {
        recording::record_control(instance_guid, allowed_kinds, timeout_ms)
    }
    #[cfg(not(windows))]
    {
        Err("DirectInput recording is only available on Windows".to_string())
    }
}

#[tauri::command]
pub fn record_directinput_button(
    device_name: String,
    device_index: i32,
    timeout_ms: u32,
) -> Result<RecordedButton, String> {
    #[cfg(windows)]
    {
        recording::record_button(device_name, device_index, timeout_ms)
    }
    #[cfg(not(windows))]
    {
        Err("DirectInput button recording is only available on Windows".to_string())
    }
}

#[tauri::command]
pub fn record_directinput_button_from_devices(
    device_indices: Vec<i32>,
    timeout_ms: u32,
) -> Result<RecordedButton, String> {
    #[cfg(windows)]
    {
        recording::record_button_from_devices(device_indices, timeout_ms)
    }
    #[cfg(not(windows))]
    {
        Err("DirectInput button recording is only available on Windows".to_string())
    }
}

#[tauri::command]
pub fn record_directinput_axis_from_devices(
    device_indices: Vec<i32>,
    timeout_ms: u32,
    preferred_usage_id: Option<String>,
) -> Result<RecordedAxis, String> {
    #[cfg(windows)]
    {
        recording::record_axis_from_devices(device_indices, timeout_ms, preferred_usage_id)
    }
    #[cfg(not(windows))]
    {
        Err("DirectInput axis recording is only available on Windows".to_string())
    }
}
