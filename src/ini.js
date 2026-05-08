import { defaultShipBindings, defaultShipOutputs } from "./shipActions";

export const axisRows = [
  { title: "Throttle", axis: "iThrottleAxis" },
  { title: "Pitch", axis: "iPitchAxis", sens: "fPitchSensitivity", invert: "bInvertPitch" },
  { title: "Yaw", axis: "iYawAxis", sens: "fYawSensitivity", invert: "bInvertYaw" },
  { title: "Roll", axis: "iRollAxis", sens: "fRollSensitivity", invert: "bInvertRoll" },
  { title: "Strafe lateral", axis: "iStrafeLatAxis", invert: "bInvertStrafeLat" },
  { title: "Strafe vertical", axis: "iStrafeVertAxis", invert: "bInvertStrafeVert" },
  { title: "Reverse slider", axis: "iReverseAxis", sens: "fReverseSensitivity", invert: "bInvertReverse" }
];

export const defaults = {
  sDeviceName: "vJoy",
  iVJoyDeviceId: "1",
  sAxisDeviceName: "vJoy",
  iAxisDeviceIndex: "0",
  sShipButtonDeviceName: "vJoy",
  iShipButtonDeviceIndex: "0",
  iThrottleAxis: "0x32",
  iPitchAxis: "0x31",
  iYawAxis: "0x30",
  iRollAxis: "0x33",
  iStrafeLatAxis: "0x35",
  iStrafeVertAxis: "0x34",
  iReverseAxis: "0x36",
  fPitchSensitivity: "1.0",
  fYawSensitivity: "1.0",
  fRollSensitivity: "1.0",
  fStrafeSensitivity: "1.0",
  fReverseSensitivity: "1.0",
  bInvertPitch: true,
  bInvertYaw: false,
  bInvertRoll: false,
  bInvertStrafeLat: false,
  bInvertStrafeVert: false,
  bInvertReverse: false,
  iDetentCenter: "32768",
  iDetentDeadzone: "500",
  bReverseEnabled: false,
  bUnipolarMode: true,
  fIdlePlateau: "0.05",
  fReverseDeadzone: "0.05",
  fReverseActivationThreshold: "0.05",
  iPollRateHz: "120",
  iThrottleBurstMs: "250",
  bLogThrottle: false,
  bReverseAxisEnabled: true,
  iActivateButtonId: "69",
  iStopButtonId: "70",
  iBoostButtonId: "-1",
  iDigitalReverseButton: "-1",
  iDigitalRollLeftButton: "-1",
  iDigitalRollRightButton: "-1",
  iDigitalStrafeLeftButton: "-1",
  iDigitalStrafeRightButton: "-1",
  iDigitalStrafeUpButton: "-1",
  iDigitalStrafeDownButton: "-1",
  fDigitalRollValue: "1.0",
  fDigitalStrafeValue: "1.0",
  bShipButtonsEnabled: true,
  ...defaultShipBindings(),
  ...defaultShipOutputs()
};

export const sections = {
  Hardware: ["sDeviceName", "iVJoyDeviceId", "iThrottleAxis", "iPitchAxis", "iYawAxis", "iRollAxis", "iStrafeLatAxis", "iStrafeVertAxis", "iReverseAxis", "fPitchSensitivity", "fYawSensitivity", "fRollSensitivity", "fStrafeSensitivity", "fReverseSensitivity", "bInvertPitch", "bInvertYaw", "bInvertRoll", "bInvertStrafeLat", "bInvertStrafeVert", "bInvertReverse"],
  InputDevices: ["sAxisDeviceName", "iAxisDeviceIndex", "sShipButtonDeviceName", "iShipButtonDeviceIndex"],
  Buttons: ["iActivateButtonId", "iStopButtonId", "iBoostButtonId"],
  Normalization: ["iDetentCenter", "iDetentDeadzone", "bReverseEnabled", "bUnipolarMode", "fIdlePlateau", "fReverseDeadzone", "fReverseActivationThreshold"],
  Injection: ["iPollRateHz", "iThrottleBurstMs", "bLogThrottle", "bReverseAxisEnabled"],
  DigitalAxes: ["iDigitalReverseButton", "iDigitalRollLeftButton", "iDigitalRollRightButton", "iDigitalStrafeLeftButton", "iDigitalStrafeRightButton", "iDigitalStrafeUpButton", "iDigitalStrafeDownButton", "fDigitalRollValue", "fDigitalStrafeValue"],
  ShipButtons: ["bShipButtonsEnabled", ...Object.keys(defaultShipBindings())],
  ShipButtonOutputs: Object.keys(defaultShipOutputs())
};

export function parseKnownValues(text) {
  const data = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && match[1] in defaults) {
      data[match[1]] = typeof defaults[match[1]] === "boolean"
        ? match[2].trim().toLowerCase() === "true"
        : match[2];
    }
  }
  return data;
}

function boolText(value) {
  return value ? "true" : "false";
}

function valueText(value) {
  return typeof value === "boolean" ? boolText(value) : String(value);
}

function setIniValue(text, section, key, value) {
  const lines = text.split(/\r?\n/);
  const sectionPattern = new RegExp(`^\\s*\\[${section}\\]\\s*$`, "i");
  const anySectionPattern = /^\s*\[[^\]]+\]\s*$/;
  const keyPattern = new RegExp(`^\\s*${key}\\s*=`, "i");
  let start = lines.findIndex((line) => sectionPattern.test(line));

  if (start === -1) {
    lines.push("", `[${section}]`, `${key} = ${valueText(value)}`);
    return lines.join("\n");
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (anySectionPattern.test(lines[i])) {
      end = i;
      break;
    }
  }

  for (let i = start + 1; i < end; i++) {
    if (keyPattern.test(lines[i])) {
      lines[i] = `${key} = ${valueText(value)}`;
      return lines.join("\n");
    }
  }

  lines.splice(end, 0, `${key} = ${valueText(value)}`);
  return lines.join("\n");
}

function removeIniSection(text, section) {
  const lines = text.split(/\r?\n/);
  const sectionPattern = new RegExp(`^\\s*\\[${section}\\]\\s*$`, "i");
  const anySectionPattern = /^\s*\[[^\]]+\]\s*$/;
  const start = lines.findIndex((line) => sectionPattern.test(line));
  if (start === -1) return text;

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (anySectionPattern.test(lines[i])) {
      end = i;
      break;
    }
  }

  lines.splice(start, end - start);
  return lines.join("\n");
}

export function buildIni(data, loadedIni = "") {
  data = withDerivedLegacyValues(data);
  let text = loadedIni || `[General]
bEnabled = true

[Hardware]

[InputDevices]
sAxisDeviceName = vJoy
iAxisDeviceIndex = 0
sShipButtonDeviceName = vJoy
iShipButtonDeviceIndex = 0

[Buttons]
iActivateButtonId = 69
iStopButtonId = 70
iBoostButtonId = -1

[Normalization]

[Injection]
bRollEnabled = true
fSignpostValue = 0.0314
fSignpostTolerance = 0.0025
`;

  text = removeIniSection(removeIniSection(text, "AxisSources"), "ButtonSources");
  for (const [section, keys] of Object.entries(sections)) {
    for (const key of keys) {
      text = setIniValue(text, section, key, data[key]);
    }
  }
  return text.trimEnd() + "\n";
}

function withDerivedLegacyValues(data) {
  const derived = { ...data };
  for (const row of axisRows) {
    derived[row.axis] = normalizeAxisControlId(derived[row.axis]);
  }
  derived.sDeviceName = "vJoy";
  derived.sAxisDeviceName = "vJoy";
  derived.sShipButtonDeviceName = "vJoy";
  return derived;
}

export function normalizeAxisControlId(controlId) {
  const text = String(controlId ?? "").trim();
  const hexMatch = text.match(/^0x(3[0-7])$/i);
  if (hexMatch) return `0x${hexMatch[1].toUpperCase()}`;

  const decimalLikeMatch = text.match(/^0*(3[0-7])$/);
  if (decimalLikeMatch) return `0x${decimalLikeMatch[1]}`;

  return text;
}
