use serde::Deserialize;
use std::thread;
use std::time::Duration;

#[derive(Deserialize)]
pub struct ShipOutput {
    pub kind: String,
    pub code: u16,
    #[serde(default)]
    pub extended: bool,
}

#[tauri::command]
pub fn emit_ship_output(output: ShipOutput, mode: String) -> Result<(), String> {
    emit_output_for_preview(&output, &mode)
}

#[cfg(windows)]
pub fn emit_output_for_preview(output: &ShipOutput, mode: &str) -> Result<(), String> {
    send_output(output, false)?;

    let dwell_ms = if mode.eq_ignore_ascii_case("hold") { 90 } else { 35 };
    thread::sleep(Duration::from_millis(dwell_ms));

    send_output(output, true)
}

#[cfg(not(windows))]
pub fn emit_output_for_preview(_output: &ShipOutput, _mode: &str) -> Result<(), String> {
    Err("Direct input emission is only available on Windows".to_string())
}

#[cfg(windows)]
pub fn send_output(output: &ShipOutput, key_up: bool) -> Result<(), String> {
    match output.kind.as_str() {
        "keyboard" => send_keyboard_scan_code(output.code, output.extended, key_up),
        "mouse" => send_mouse_button(output.code, key_up),
        other => Err(format!("Unsupported output kind: {other}")),
    }
}

#[cfg(windows)]
pub fn send_keyboard_scan_code(scan_code: u16, extended: bool, key_up: bool) -> Result<(), String> {
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
pub fn send_mouse_button(button: u16, key_up: bool) -> Result<(), String> {
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
