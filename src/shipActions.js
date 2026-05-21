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
  action("IncreaseSystemPower", "Increase System Power", "iIncreaseSystemPowerButton", "hold", key("Up", 0x48, true), null),
  action("DecreaseSystemPower", "Decrease System Power", "iDecreaseSystemPowerButton", "hold", key("Down", 0x50, true), null),
  action("PreviousSystem", "Previous System", "iPreviousSystemButton", "hold", key("Left", 0x4b, true), null),
  action("NextSystem", "Next System", "iNextSystemButton", "hold", key("Right", 0x4d, true), null),
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

export const scancodeToStarfieldToken = {
  "key:0x01": 0x011B, // Esc
  "key:0x02": 0x0131, // 1
  "key:0x03": 0x0132, // 2
  "key:0x04": 0x0133, // 3
  "key:0x05": 0x0134, // 4
  "key:0x06": 0x0135, // 5
  "key:0x07": 0x0136, // 6
  "key:0x08": 0x0137, // 7
  "key:0x09": 0x0138, // 8
  "key:0x0a": 0x0139, // 9
  "key:0x0b": 0x0130, // 0
  "key:0x0c": 0x01BD, // -
  "key:0x0d": 0x01BB, // =
  "key:0x0e": 0x0108, // Backspace
  "key:0x0f": 0x0109, // Tab
  "key:0x10": 0x0151, // Q
  "key:0x11": 0x0157, // W
  "key:0x12": 0x0145, // E
  "key:0x13": 0x0152, // R
  "key:0x14": 0x0154, // T
  "key:0x15": 0x0159, // Y
  "key:0x16": 0x0155, // U
  "key:0x17": 0x0149, // I
  "key:0x18": 0x014F, // O
  "key:0x19": 0x0150, // P
  "key:0x1a": 0x01DB, // [
  "key:0x1b": 0x01DD, // ]
  "key:0x1c": 0x010D, // Enter
  "key:0x1d": 0x00A2, // L Ctrl
  "key:0x1e": 0x0141, // A
  "key:0x1f": 0x0153, // S
  "key:0x20": 0x0144, // D
  "key:0x21": 0x0146, // F
  "key:0x22": 0x0147, // G
  "key:0x23": 0x0148, // H
  "key:0x24": 0x014A, // J
  "key:0x25": 0x014B, // K
  "key:0x26": 0x014C, // L
  "key:0x27": 0x01BA, // ;
  "key:0x28": 0x01DE, // '
  "key:0x29": 0x01C0, // `
  "key:0x2a": 0x00A0, // L Shift
  "key:0x2b": 0x01DC, // \
  "key:0x2c": 0x015A, // Z
  "key:0x2d": 0x0158, // X
  "key:0x2e": 0x0143, // C
  "key:0x2f": 0x0156, // V
  "key:0x30": 0x0142, // B
  "key:0x31": 0x014E, // N
  "key:0x32": 0x014D, // M
  "key:0x33": 0x01BC, // ,
  "key:0x34": 0x01BE, // .
  "key:0x35": 0x01BF, // /
  "key:0x36": 0x01A1, // R Shift
  "key:0x37": 0x016A, // Numpad *
  "key:0x38": 0x00A4, // L Alt
  "key:0x39": 0x0120, // Space
  "key:0x3a": 0x0114, // Caps Lock
  "key:0x3b": 0x0170, // F1
  "key:0x3c": 0x0171, // F2
  "key:0x3d": 0x0172, // F3
  "key:0x3e": 0x0173, // F4
  "key:0x3f": 0x0174, // F5
  "key:0x40": 0x0175, // F6
  "key:0x41": 0x0176, // F7
  "key:0x42": 0x0177, // F8
  "key:0x43": 0x0178, // F9
  "key:0x44": 0x0179, // F10
  "key:0x45": 0x0190, // Num Lock
  "key:0x46": 0x0191, // Scroll Lock
  "key:0x47": 0x0167, // Numpad 7
  "key:0x48": 0x0026, // Up arrow
  "key:0x49": 0x0169, // Numpad 9
  "key:0x4a": 0x016D, // Numpad -
  "key:0x4b": 0x0025, // Left arrow
  "key:0x4c": 0x0165, // Numpad 5
  "key:0x4d": 0x0027, // Right arrow
  "key:0x4e": 0x016B, // Numpad +
  "key:0x4f": 0x0161, // Numpad 1
  "key:0x50": 0x0028, // Down arrow
  "key:0x51": 0x0163, // Numpad 3
  "key:0x52": 0x0160, // Numpad 0
  "key:0x53": 0x016E, // Numpad .
  "key:0x57": 0x017A, // F11
  "key:0x58": 0x017B, // F12

  // Mouse Buttons
  "mouse:1": 0x0000,
  "mouse:2": 0x0001,
  "mouse:3": 0x0002,
  "mouse:4": 0x0003
};

export function outputToStarfieldToken(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized || normalized === "none") {
    return { device: 1, token: 0x02FF };
  }
  const token = scancodeToStarfieldToken[normalized];
  if (token !== undefined) {
    return { device: 1, token };
  }
  
  const keyMatch = normalized.match(/^key:0x([0-9a-f]{1,4})$/i);
  if (keyMatch) {
    return { device: 1, token: 0x02FF };
  }
  
  const mouseMatch = normalized.match(/^mouse:([1-4])$/);
  if (mouseMatch) {
    const code = Number.parseInt(mouseMatch[1], 10);
    return { device: 1, token: code - 1 };
  }
  
  return { device: 1, token: 0x02FF };
}

export const unusedKeyboardKeys = [
  "key:0x1A", // [
  "key:0x1B", // ]
  "key:0x27", // ;
  "key:0x28", // '
  "key:0x2B", // \
  "key:0x33", // ,
  "key:0x34", // .
  "key:0x35", // /
  "key:0x0C", // -
  "key:0x0D", // =
  "key:0x0E", // Backspace
  "key:0x46", // Scroll Lock
  "key:0x45", // Num Lock
  "key:0x36", // R Shift
  "key:0x37", // Numpad *
  "key:0x4A", // Numpad -
  "key:0x4E", // Numpad +
  "key:0x47", // Numpad 7
  "key:0x49", // Numpad 9
  "key:0x4C", // Numpad 5
  "key:0x4F", // Numpad 1
  "key:0x51", // Numpad 3
  "key:0x52", // Numpad 0
  "key:0x53"  // Numpad .
];


