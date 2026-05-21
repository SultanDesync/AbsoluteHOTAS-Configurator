use serde::Serialize;

#[derive(Clone, Serialize)]
pub struct DirectInputDeviceInfo {
    pub name: String,
    pub instance_name: String,
    pub product_name: String,
    pub instance_guid: String,
    pub product_guid: String,
    pub enumeration_index: i32,
}

#[derive(Clone, Serialize)]
pub struct DirectInputControlInfo {
    pub kind: String,
    pub id: String,
    pub label: String,
    pub name: String,
    pub guid_type: String,
    pub offset: u32,
    pub object_type: u32,
    pub instance: u32,
}

#[derive(Clone, Serialize)]
pub struct DirectInputInventoryDevice {
    pub name: String,
    pub instance_name: String,
    pub product_name: String,
    pub instance_guid: String,
    pub product_guid: String,
    pub enumeration_index: i32,
    pub controls: Vec<DirectInputControlInfo>,
}

#[derive(Clone, Serialize)]
pub struct DirectInputControlSample {
    pub kind: String,
    pub id: String,
    pub label: String,
    pub name: String,
    pub guid_type: String,
    pub offset: u32,
    pub object_type: u32,
    pub instance: u32,
    pub value: i32,
    pub normalized: f32,
}

#[derive(Serialize)]
pub struct RecordedControl {
    pub device_name: String,
    pub instance_guid: String,
    pub product_guid: String,
    pub enumeration_index: i32,
    pub kind: String,
    pub id: String,
    pub label: String,
}

#[derive(Serialize)]
pub struct RecordedButton {
    pub device_name: String,
    pub enumeration_index: i32,
    pub button_id: i32,
}

#[derive(Serialize)]
pub struct RecordedAxis {
    pub device_name: String,
    pub enumeration_index: i32,
    pub usage_id: String,
}
