# AbsoluteHOTAS Configurator

Desktop companion app for building `AbsoluteHOTAS.ini` for the AbsoluteHOTAS
Starfield plugin.

This repository contains only the standalone configurator source. It does not
include the AbsoluteHOTAS SFSE plugin source, research notes, release payloads,
or other parent-project files.

This version is intentionally barebones:

- Load and save `AbsoluteHOTAS.ini`
- Select vJoy axes from the controls DirectInput reports
- Bind the next changed vJoy axis or button
- Bind activate, deactivate/stop, and boost stand-down buttons in `[Buttons]`
- Bind reverse slider memory-injection fields
- Bind ship action buttons in `[ShipButtons]`
- Choose vanilla ship output overrides in `[ShipButtonOutputs]`
- Preview the exact INI that will be written with the `Show INI` toggle

The app targets vJoy only. It does not keep a live monitor, event logger,
GUID-backed source bindings, alternate recording paths, or smoothing/dampening
logic.

## Binding Workflow

1. Load the INI, or start from defaults.
2. Confirm the app found the vJoy DirectInput device.
3. Use a dropdown to choose a known vJoy control, or click `Bind`.
4. Move the intended vJoy axis or press the intended vJoy button.
5. Save the generated INI.

`Bind` uses the native DirectInput recorder scoped to the vJoy device. Axis
recording samples the current rest/noise state, then captures deliberate
movement. Button recording captures a new vJoy button press after arming. Axis
values are written as HID usage IDs in `[Hardware]`, such as `0x30` for X and
`0x32` for Z. Button values are written as 1-indexed vJoy DirectInput button
IDs. `-1` disables an individual button binding.

Ship outputs mirror physical vJoy button duration. A short press becomes a
short vanilla input; a held vJoy button keeps the mapped key or mouse button
held until release.

If `Bind` times out, the row is left unchanged. Axis rows display the current
INI value when it does not resolve to a detected vJoy control, so a stale or
default value is visible instead of looking like a fresh capture.

## Requirements

- Windows
- vJoy installed and configured
- Microsoft Edge WebView2 Runtime, normally already present on modern Windows
- Node.js and Rust, only if building from source

## Download

For normal use, download the latest portable EXE or installer from the project
release page or Nexus Mods page. The app writes only the INI path you choose.

## Building From Source

Use `npm.cmd` on Windows shells where PowerShell blocks `npm.ps1`:

```powershell
npm.cmd install
npm.cmd run tauri dev
npm.cmd run tauri build
```

Generated output is intentionally excluded from source control:
`node_modules`, `dist`, `src-tauri/target`, and installer artifacts.

## License

This configurator source is released under the MIT License. See `LICENSE`.

## Attribution

See `NOTICE.md` for third-party technology attributions and trademark notes.

## Runtime Schema

```ini
[InputDevices]
sAxisDeviceName = vJoy
iAxisDeviceIndex = 0
sShipButtonDeviceName = vJoy
iShipButtonDeviceIndex = 0

[Buttons]
iActivateButtonId = 69
iStopButtonId = 70
iBoostButtonId = -1
```

Reverse slider memory injection is exported separately from ship button output:

```ini
[Hardware]
iReverseAxis = 0x36
fReverseSensitivity = 1.0
bInvertReverse = false

[Normalization]
bReverseEnabled = false
fReverseDeadzone = 0.05
fReverseActivationThreshold = 0.05

[Injection]
bReverseAxisEnabled = true
```

`bReverseEnabled` is legacy center-detent throttle reverse. Keep it separate from
`bReverseAxisEnabled`, which controls the dedicated reverse slider path.

`[ShipButtonOutputs]` accepts:

- `key:0xNN` for keyboard scan-code output
- `mouse:1`, `mouse:2`, `mouse:3`, `mouse:4` for left, right, middle, and XBUTTON1
- `none` to disable emitted output for that action
