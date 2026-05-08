const key = (label, code, extended = false) => ({
  kind: "keyboard",
  label,
  value: `key:0x${code.toString(16).toUpperCase().padStart(2, "0")}`,
  code,
  extended
});

const mouse = (label, code) => ({
  kind: "mouse",
  label,
  value: `mouse:${label.toLowerCase().replace("mouse", "")}`,
  code,
  extended: false
});

function action(id, label, iniKey, mode, main, alt = null) {
  return {
    id,
    label,
    iniKey,
    outputIniKey: `s${id}Output`,
    mode,
    outputs: { main, alt }
  };
}

export const shipActions = [
  action("FireBoosters", "Fire Boosters", "iFireBoostersButton", "hold", key("L Shift", 0x2a)),
  action("SwitchFlightModes", "Switch Flight Modes", "iSwitchFlightModesButton", "hold", key("Space", 0x39)),
  action("TogglePov", "Toggle POV", "iTogglePovButton", "hold", key("Q", 0x10), mouse("Mouse3", 3)),
  action("FireWeapon0", "Fire Weapon 0", "iFireWeapon0Button", "hold", mouse("Mouse1", 1)),
  action("FireWeapon1", "Fire Weapon 1", "iFireWeapon1Button", "hold", mouse("Mouse2", 2)),
  action("FireWeapon2", "Fire Weapon 2", "iFireWeapon2Button", "hold", key("G", 0x22), mouse("Mouse4", 4)),
  action("ShipAction1", "Ship Action 1", "iShipAction1Button", "hold", key("R", 0x13)),
  action("SelectTarget", "Select Target", "iSelectTargetButton", "hold", key("E", 0x12)),
  action("IncreaseSystemPower", "Increase System Power", "iIncreaseSystemPowerButton", "hold", key("Up", 0x48, true), key("V", 0x2f)),
  action("DecreaseSystemPower", "Decrease System Power", "iDecreaseSystemPowerButton", "hold", key("Down", 0x50, true), key("C", 0x2e)),
  action("PreviousSystem", "Previous System", "iPreviousSystemButton", "hold", key("Left", 0x4b, true), key("Z", 0x2c)),
  action("NextSystem", "Next System", "iNextSystemButton", "hold", key("Right", 0x4d, true), key("X", 0x2d)),
  action("OpenScanner", "Open Scanner", "iOpenScannerButton", "hold", key("F", 0x21)),
  action("Repair", "Repair", "iRepairButton", "hold", key("O", 0x18)),
  action("ShipAlternateControlHold", "Ship Alternate Control Hold", "iShipAlternateControlHoldButton", "hold", key("L Alt", 0x38)),
  action("Cruise", "Cruise", "iCruiseButton", "hold", key("T", 0x14)),
  action("Cancel", "Cancel", "iCancelButton", "hold", null),
  action("UndockTakeOff", "Undock / Take-Off", "iUndockTakeOffButton", "hold", key("Space", 0x39)),
  action("GetUp", "Get Up", "iGetUpButton", "hold", key("E", 0x12)),
  action("ExitShipFromCockpit", "Exit Ship From Cockpit", "iExitShipFromCockpitButton", "hold", key("X", 0x2d)),
  action("ZoomCameraIn", "Zoom Camera In", "iZoomCameraInButton", "hold", mouse("Mouse1", 1)),
  action("ZoomCameraOut", "Zoom Camera Out", "iZoomCameraOutButton", "hold", mouse("Mouse2", 2)),
  action("AutopilotOnOff", "Autopilot On / Off", "iAutopilotOnOffButton", "hold", key("Space", 0x39))
];

export function defaultShipBindings() {
  return Object.fromEntries(shipActions.map((action) => [action.iniKey, "-1"]));
}

export function defaultShipOutputs() {
  return Object.fromEntries(shipActions.map((action) => [
    action.outputIniKey,
    action.outputs.main?.value ?? "none"
  ]));
}

export function outputFromValue(action, value) {
  const normalized = String(value ?? "").toLowerCase();
  return [action.outputs.main, action.outputs.alt].find((output) => output?.value.toLowerCase() === normalized) ?? null;
}

export function outputLabel(output) {
  return output?.label ?? "Unbound";
}
