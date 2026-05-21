use serde::Deserialize;
use std::fs;
use std::path::Path;

#[derive(Deserialize)]
pub struct ControlMapBinding {
    pub context: String,
    pub action: String,
    pub device: u32,
    pub token: u16,
    pub is_secondary: bool,
}

pub struct Record {
    pub context: String,
    pub action: String,
    pub payload: [u8; 8],
}

pub struct Section {
    pub header_byte: u8,
    pub records: Vec<Record>,
}

#[tauri::command]
pub fn select_file(filter_name: String, filter_ext: String, title: String) -> Result<Option<String>, String> {
    let file = rfd::FileDialog::new()
        .add_filter(&filter_name, &[&filter_ext])
        .set_title(&title)
        .pick_file();
    Ok(file.map(|p| p.to_string_lossy().into_owned()))
}

#[tauri::command]
pub fn select_save_file(filter_name: String, filter_ext: String, title: String) -> Result<Option<String>, String> {
    let file = rfd::FileDialog::new()
        .add_filter(&filter_name, &[&filter_ext])
        .set_title(&title)
        .save_file();
    Ok(file.map(|p| p.to_string_lossy().into_owned()))
}

fn is_managed_context(context: &str) -> bool {
    matches!(
        context,
        "ShipHUD" | "ShipHUD_Cancel" | "Spaceship_Interaction" | "ShipFlightCam_FreeRot" | "ShipHUD_CruiseMode"
    )
}

#[tauri::command]
pub fn write_control_map(file_path: String, bindings: Vec<ControlMapBinding>) -> Result<(), String> {
    let path_ref = Path::new(&file_path);
    
    let mut sections = if path_ref.exists() {
        let bytes = fs::read(path_ref).map_err(|err| format!("Failed to read {}: {}", file_path, err))?;
        parse_control_map(&bytes)?
    } else {
        vec![
            Section { header_byte: 0x03, records: Vec::new() },
            Section { header_byte: 0x03, records: Vec::new() },
            Section { header_byte: 0x03, records: Vec::new() },
        ]
    };
    
    while sections.len() < 3 {
        sections.push(Section {
            header_byte: 0x03,
            records: Vec::new(),
        });
    }
    
    if let Some(sec1) = sections.get_mut(0) {
        // Starfield stores game-menu keyboard/mouse overrides in section 0.
        // Primary overrides are flagged with 0x00 in payload[6];
        // secondary overrides are flagged with 0x02.
        sec1.records.retain(|rec| !is_managed_context(&rec.context));

        for binding in &bindings {
            let mut payload = [0u8; 8];
            payload[0..4].copy_from_slice(&binding.device.to_le_bytes());
            payload[4..6].copy_from_slice(&binding.token.to_le_bytes());
            payload[6] = if binding.is_secondary { 0x02 } else { 0x00 };
            payload[7] = 0x00;
            sec1.records.push(Record {
                context: binding.context.clone(),
                action: binding.action.clone(),
                payload,
            });
        }
    }
    
    if let Some(sec2) = sections.get_mut(1) {
        // Remove stale managed rows from older configurator builds that wrote
        // the secondary override shape into section 1.
        sec2.records.retain(|rec| !is_managed_context(&rec.context));
    }
    
    // Cross-Action conflict resolution in Section 0 (Starfield keyboard/mouse override)
    // We only resolve secondary conflicts, keeping default primary bindings intact.
    if let Some(sec1) = sections.get_mut(0) {
        for binding in &bindings {
            if binding.is_secondary && binding.token != 0x02FF {
                for rec in &mut sec1.records {
                    if rec.context == binding.context && rec.action != binding.action {
                        let rec_device = u32::from_le_bytes(rec.payload[0..4].try_into().unwrap());
                        let rec_token = u16::from_le_bytes(rec.payload[4..6].try_into().unwrap());
                        let rec_is_secondary = rec.payload[6] == 0x02;
                        if rec_is_secondary && rec_device == binding.device && rec_token == binding.token {
                            let mut payload = [0u8; 8];
                            payload[0..4].copy_from_slice(&1u32.to_le_bytes());
                            payload[4..6].copy_from_slice(&0x02FFu16.to_le_bytes());
                            payload[6] = 0x02;
                            payload[7] = 0x00;
                            rec.payload = payload;
                        }
                    }
                }
            }
        }
    }
    
    if path_ref.exists() {
        let mut bak_path = path_ref.to_path_buf();
        bak_path.set_extension("txt.bak");
        fs::copy(path_ref, &bak_path).map_err(|err| {
            format!("Failed to create backup file at {}: {}", bak_path.display(), err)
        })?;
    } else if let Some(parent) = path_ref.parent() {
        fs::create_dir_all(parent).map_err(|err| {
            format!("Failed to create directories {}: {}", parent.display(), err)
        })?;
    }
    
    let serialized = serialize_control_map(&sections);
    fs::write(path_ref, &serialized).map_err(|err| format!("Failed to write {}: {}", file_path, err))?;
    
    Ok(())
}

pub fn parse_control_map(data: &[u8]) -> Result<Vec<Section>, String> {
    let mut sections = Vec::new();
    let mut offset = 0;
    
    while offset < data.len() {
        if offset + 3 > data.len() {
            return Err("Unexpected EOF reading section header".to_string());
        }
        let header_byte = data[offset];
        if header_byte != 0x03 {
            return Err(format!("Invalid section header byte 0x{:02X} at offset {}", header_byte, offset));
        }
        let len = ((data[offset + 1] as usize) << 8) | (data[offset + 2] as usize);
        if offset + len > data.len() {
            return Err(format!("Section length {} exceeds remaining bytes", len));
        }
        
        let section_end = offset + len;
        let mut records = Vec::new();
        let mut rec_offset = offset + 3;
        
        while rec_offset < section_end {
            let ctx_end = data[rec_offset..section_end].iter().position(|&b| b == 0);
            let ctx_pos = match ctx_end {
                Some(p) => p,
                None => break,
            };
            let context = String::from_utf8_lossy(&data[rec_offset..rec_offset + ctx_pos]).into_owned();
            
            let act_start = rec_offset + ctx_pos + 1;
            let act_end = data[act_start..section_end].iter().position(|&b| b == 0);
            let act_pos = match act_end {
                Some(p) => p,
                None => return Err("Missing action string in record".to_string()),
            };
            let action = String::from_utf8_lossy(&data[act_start..act_start + act_pos]).into_owned();
            
            let payload_start = act_start + act_pos + 1;
            if payload_start + 8 > section_end {
                return Err("Payload exceeds section bounds".to_string());
            }
            let mut payload = [0u8; 8];
            payload.copy_from_slice(&data[payload_start..payload_start + 8]);
            
            records.push(Record { context, action, payload });
            rec_offset = payload_start + 8;
        }
        
        sections.push(Section { header_byte, records });
        offset = section_end;
    }
    Ok(sections)
}

pub fn serialize_control_map(sections: &[Section]) -> Vec<u8> {
    let mut data = Vec::new();
    for section in sections {
        let mut section_bytes = Vec::new();
        for rec in &section.records {
            section_bytes.extend_from_slice(rec.context.as_bytes());
            section_bytes.push(0);
            section_bytes.extend_from_slice(rec.action.as_bytes());
            section_bytes.push(0);
            section_bytes.extend_from_slice(&rec.payload);
        }
        let len = section_bytes.len() + 3;
        data.push(section.header_byte);
        data.push((len >> 8) as u8);
        data.push((len & 0xFF) as u8);
        data.extend_from_slice(&section_bytes);
    }
    data
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_control_map_round_trip() {
        let mut records = Vec::new();
        records.push(Record {
            context: "ShipHUD".to_string(),
            action: "WeaponGroup1".to_string(),
            payload: [1, 2, 3, 4, 5, 6, 7, 8],
        });
        
        let sections = vec![
            Section { header_byte: 0x03, records },
            Section { header_byte: 0x03, records: Vec::new() },
            Section { header_byte: 0x03, records: Vec::new() },
        ];
        
        let serialized = serialize_control_map(&sections);
        let parsed = parse_control_map(&serialized).expect("Should parse back successfully");
        
        assert_eq!(parsed.len(), 3);
        assert_eq!(parsed[0].header_byte, 0x03);
        assert_eq!(parsed[0].records.len(), 1);
        assert_eq!(parsed[0].records[0].context, "ShipHUD");
        assert_eq!(parsed[0].records[0].action, "WeaponGroup1");
        assert_eq!(parsed[0].records[0].payload, [1, 2, 3, 4, 5, 6, 7, 8]);
    }

    #[test]
    fn test_write_control_map_merges_properly() {
        let temp_dir = std::env::temp_dir();
        let file_path = temp_dir.join("ControlMap_Custom_Test.txt");
        let file_path_str = file_path.to_string_lossy().into_owned();
        
        if file_path.exists() {
            let _ = std::fs::remove_file(&file_path);
        }
        
        let bindings = vec![
            ControlMapBinding {
                context: "ShipHUD".to_string(),
                action: "Boosters".to_string(),
                device: 1,
                token: 0x02FF,
                is_secondary: true,
            }
        ];
        
        write_control_map(file_path_str.clone(), bindings).expect("Write mock map should succeed");
        
        let content = std::fs::read(&file_path).expect("File must exist");
        let parsed = parse_control_map(&content).expect("Must parse successfully");
        
        assert_eq!(parsed.len(), 3);
        assert_eq!(parsed[0].records.len(), 1);
        let expected_secondary_payload = [
            1, 0, 0, 0, // device (1)
            0xFF, 0x02, // token (0x02FF)
            0x02, 0     // Starfield secondary override flags
        ];
        assert_eq!(parsed[0].records[0].payload, expected_secondary_payload);
        assert_eq!(parsed[1].records.len(), 0);
        
        let _ = std::fs::remove_file(file_path);
    }

    #[test]
    fn test_write_control_map_uses_game_secondary_shape() {
        let temp_dir = std::env::temp_dir();
        let file_path = temp_dir.join("ControlMap_Custom_Conflict_Test.txt");
        let file_path_str = file_path.to_string_lossy().into_owned();
        
        if file_path.exists() {
            let _ = std::fs::remove_file(&file_path);
        }
        
        // Pre-create the bad shape from older configurator builds: managed
        // spaceship rows in the primary section.
        let mut toggle_payload = [0u8; 8];
        toggle_payload[0..4].copy_from_slice(&1u32.to_le_bytes());
        toggle_payload[4..6].copy_from_slice(&0x0051u16.to_le_bytes());
        toggle_payload[6] = 0x02;
        toggle_payload[7] = 0x00;
        
        let mut select_payload = [0u8; 8];
        select_payload[0..4].copy_from_slice(&1u32.to_le_bytes());
        select_payload[4..6].copy_from_slice(&0x0045u16.to_le_bytes());
        select_payload[6] = 0x02;
        select_payload[7] = 0x00;

        let sections = vec![
            Section {
                header_byte: 0x03,
                records: vec![
                    Record {
                        context: "ShipHUD".to_string(),
                        action: "TogglePOV".to_string(),
                        payload: toggle_payload,
                    },
                    Record {
                        context: "ShipHUD".to_string(),
                        action: "SelectTarget".to_string(),
                        payload: select_payload,
                    },
                ],
            },
            Section { header_byte: 0x03, records: Vec::new() },
            Section { header_byte: 0x03, records: Vec::new() },
        ];
        
        let serialized = serialize_control_map(&sections);
        std::fs::write(&file_path, &serialized).expect("Write initial mock should succeed");
        
        let bindings = vec![
            ControlMapBinding {
                context: "ShipHUD".to_string(),
                action: "TogglePOV".to_string(),
                device: 1,
                token: 0x02FF,
                is_secondary: true,
            },
            ControlMapBinding {
                context: "ShipHUD".to_string(),
                action: "SelectTarget".to_string(),
                device: 1,
                token: 0x01DD,
                is_secondary: true,
            }
        ];
        
        write_control_map(file_path_str.clone(), bindings).expect("Write map should succeed");
        
        let content = std::fs::read(&file_path).expect("File must exist");
        let parsed = parse_control_map(&content).expect("Must parse successfully");
        
        assert_eq!(parsed.len(), 3);
        assert_eq!(parsed[0].records.len(), 2);
        assert_eq!(parsed[0].records[0].action, "TogglePOV");
        assert_eq!(parsed[0].records[0].payload, [1, 0, 0, 0, 0xFF, 0x02, 0x02, 0]);
        assert_eq!(parsed[0].records[1].action, "SelectTarget");
        assert_eq!(parsed[0].records[1].payload, [1, 0, 0, 0, 0xDD, 0x01, 0x02, 0]);
        assert_eq!(parsed[1].records.len(), 0);
        
        let _ = std::fs::remove_file(file_path);
    }
}
