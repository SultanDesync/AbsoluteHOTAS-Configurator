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

export const keyboardOutputs = [
  key("Esc", 0x01),
  key("1", 0x02),
  key("2", 0x03),
  key("3", 0x04),
  key("4", 0x05),
  key("5", 0x06),
  key("6", 0x07),
  key("7", 0x08),
  key("8", 0x09),
  key("9", 0x0A),
  key("0", 0x0B),
  key("-", 0x0C),
  key("=", 0x0D),
  key("Backspace", 0x0E),
  key("Tab", 0x0F),
  key("Q", 0x10),
  key("W", 0x11),
  key("E", 0x12),
  key("R", 0x13),
  key("T", 0x14),
  key("Y", 0x15),
  key("U", 0x16),
  key("I", 0x17),
  key("O", 0x18),
  key("P", 0x19),
  key("[", 0x1A),
  key("]", 0x1B),
  key("Enter", 0x1C),
  key("L Ctrl", 0x1D),
  key("A", 0x1E),
  key("S", 0x1F),
  key("D", 0x20),
  key("F", 0x21),
  key("G", 0x22),
  key("H", 0x23),
  key("J", 0x24),
  key("K", 0x25),
  key("L", 0x26),
  key(";", 0x27),
  key("'", 0x28),
  key("`", 0x29),
  key("L Shift", 0x2A),
  key("\\", 0x2B),
  key("Z", 0x2C),
  key("X", 0x2D),
  key("C", 0x2E),
  key("V", 0x2F),
  key("B", 0x30),
  key("N", 0x31),
  key("M", 0x32),
  key(",", 0x33),
  key(".", 0x34),
  key("/", 0x35),
  key("R Shift", 0x36),
  key("Numpad *", 0x37),
  key("L Alt", 0x38),
  key("Space", 0x39),
  key("Caps Lock", 0x3A),
  key("F1", 0x3B),
  key("F2", 0x3C),
  key("F3", 0x3D),
  key("F4", 0x3E),
  key("F5", 0x3F),
  key("F6", 0x40),
  key("F7", 0x41),
  key("F8", 0x42),
  key("F9", 0x43),
  key("F10", 0x44),
  key("Num Lock", 0x45),
  key("Scroll Lock", 0x46),
  key("Numpad 7", 0x47),
  key("Up", 0x48, true),
  key("Numpad 9", 0x49),
  key("Numpad -", 0x4A),
  key("Left", 0x4B, true),
  key("Numpad 5", 0x4C),
  key("Right", 0x4D, true),
  key("Numpad +", 0x4E),
  key("Numpad 1", 0x4F),
  key("Down", 0x50, true),
  key("Numpad 3", 0x51),
  key("Numpad 0", 0x52),
  key("Numpad .", 0x53),
  key("F11", 0x57),
  key("F12", 0x58)
];

export const mouseOutputs = [
  mouse("Mouse1", 1),
  mouse("Mouse2", 2),
  mouse("Mouse3", 3),
  mouse("Mouse4", 4)
];

export const outputCatalog = [...keyboardOutputs, ...mouseOutputs];

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
  return outputOptionsForAction(action).find((output) => output.value.toLowerCase() === normalized) ??
    parseOutputValue(value);
}

export function outputLabel(output) {
  return output?.label ?? "Unbound";
}

export function outputOptionsForAction(action) {
  const defaults = [action.outputs.main, action.outputs.alt].filter(Boolean);
  const seen = new Set();
  const options = [];

  for (const output of [...defaults, ...outputCatalog]) {
    const key = output.value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({
      ...output,
      isDefault: defaults.some((candidate) => candidate.value.toLowerCase() === key)
    });
  }

  return options;
}

function parseOutputValue(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized || normalized === "none") return null;

  const keyMatch = normalized.match(/^key:0x([0-9a-f]{1,4})$/i);
  if (keyMatch) {
    const code = Number.parseInt(keyMatch[1], 16);
    return {
      kind: "keyboard",
      label: `Custom key 0x${code.toString(16).toUpperCase().padStart(2, "0")}`,
      value: `key:0x${code.toString(16).toUpperCase().padStart(2, "0")}`,
      code,
      extended: false,
      isCustom: true
    };
  }

  const mouseMatch = normalized.match(/^mouse:([1-4])$/);
  if (mouseMatch) {
    const code = Number.parseInt(mouseMatch[1], 10);
    return {
      kind: "mouse",
      label: `Mouse${code}`,
      value: `mouse:${code}`,
      code,
      extended: false,
      isCustom: true
    };
  }

  return null;
}
