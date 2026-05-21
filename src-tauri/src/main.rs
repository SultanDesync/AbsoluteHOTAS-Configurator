#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::Path;

mod win_input;
mod control_map;
mod direct_input;

#[tauri::command]
fn default_ini_path() -> String {
    r"Data\SFSE\Plugins\AbsoluteHOTAS.ini".to_string()
}

#[tauri::command]
fn default_control_map_path(handle: tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;
    if let Ok(docs) = handle.path().document_dir() {
        let path = docs.join("My Games").join("Starfield").join("ControlMap_Custom.txt");
        Ok(path.to_string_lossy().into_owned())
    } else {
        Ok("ControlMap_Custom.txt".to_string())
    }
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

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // File operations
            default_ini_path,
            default_control_map_path,
            read_ini,
            write_ini,
            
            // Win input simulation preview
            win_input::emit_ship_output,
            
            // File Explorer pickers and control map binary manager
            control_map::select_file,
            control_map::select_save_file,
            control_map::write_control_map,
            
            // DirectInput features
            direct_input::list_directinput_devices,
            direct_input::list_directinput_inventory,
            direct_input::sample_directinput_controls,
            direct_input::record_directinput_control,
            direct_input::record_directinput_button,
            direct_input::record_directinput_button_from_devices,
            direct_input::record_directinput_axis_from_devices
        ])
        .run(tauri::generate_context!())
        .expect("error while running AbsoluteHOTAS Configurator");
}
