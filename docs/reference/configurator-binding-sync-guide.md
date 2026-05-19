# Configurator Binding Sync Guide

This guide describes how the AbsoluteHOTAS configurator should write plugin bindings and Starfield control-map overrides for the 1.6 binding model.

## Goals

- Let users choose physical DirectInput buttons from the configurator.
- Let users choose keyboard/mouse outputs from a readable selector.
- Write plugin bindings to `AbsoluteHOTAS.ini`.
- Optionally write matching Starfield spaceship bindings to `ControlMap_Custom.txt`.
- Preserve unknown Starfield control-map bytes exactly.

## INI Binding Model

### Named Ship Actions

Named ship actions use two sections:

```ini
[ShipButtons]
iOpenScannerButton = 14

[ShipButtonOutputs]
sOpenScannerOutput = key:0x21
```

`[ShipButtons]` stores the physical DirectInput button ID. Valid values are `1..128`; `-1` disables the binding.

`[ShipButtonOutputs]` stores the keyboard/mouse output emitted through `SendInput`.

Supported output values:

```text
key:0xNN
mouse:1
mouse:2
mouse:3
mouse:4
none
```

If a named output key is omitted, the plugin uses its vanilla Starfield spaceship default.

### Extra Buttons

Extra raw passthrough bindings use `[ButtonExpansion]`:

```ini
[ButtonExpansion]
iButton99 = key:0x14
iButton100 = key:0x01
iButton101 = mouse:3
```

The key name identifies the physical button. The value identifies the emitted output.

Rules:

- Accept `iButton1` through `iButton128`.
- Optionally tolerate `Button1` through `Button128` in the UI/parser.
- Treat `none`, empty values, invalid outputs, and out-of-range buttons as disabled.
- Extra buttons do not have Starfield action names and should not be written into `ControlMap_Custom.txt` automatically.

## Configurator UI Shape

### Ship Buttons

Each ship action row should expose:

- Physical button selector: DirectInput button or unbound.
- Output selector: keyboard/mouse output or none.
- Vanilla default marker: show the Starfield default output as `Default`.
- Test button: emit the selected output through the existing preview command.
- Optional sync marker: whether this row should update Starfield's secondary spaceship binding.

### Extra Buttons

`Extra Buttons` should be an expandable optional section:

- Add row.
- Remove row.
- Physical button selector.
- Output selector.
- Test button.

Suggested row data:

```json
{
  "button": "99",
  "output": "key:0x14"
}
```

INI output:

```ini
[ButtonExpansion]
iButton99 = key:0x14
```

### Output Selector

Populate the selector from `key-output-reference.md` / `shipActions.js`.

The selector should include:

- Keyboard scan-code outputs.
- Mouse outputs.
- `none`.
- The vanilla default marked for each named ship action.
- Current custom value if an INI contains a value not in the selector.

## ControlMap_Custom.txt Handling

`ControlMap_Custom.txt` is not plain text. It is a compact binary override table with embedded ASCII context/action names and binary binding payloads.

Observed record shape in the first section:

```text
<context>\0<action>\0<8-byte payload>
```

Observed section behavior:

- The file begins with binary header bytes.
- At least one additional section begins later in the file.
- The parser must not treat the whole file as line-based text.
- The writer must preserve unknown bytes exactly.

### Known Context / Action Pairs

Seed ship pairs observed from a generated `ControlMap_Custom.txt`:

| UI Action | Context | Action |
| --- | --- | --- |
| Fire Boosters | `ShipHUD` | `Boosters` |
| Switch Flight Modes | `ShipHUD` | `SwitchFlightModes` |
| Toggle POV | `ShipHUD` | `TogglePOV` |
| Fire Weapon 0 | `ShipHUD` | `WeaponGroup1` |
| Fire Weapon 1 | `ShipHUD` | `WeaponGroup2` |
| Fire Weapon 2 | `ShipHUD` | `WeaponGroup3` |
| Ship Action 1 | `ShipHUD` | `XButton` |
| Select Target | `ShipHUD` | `SelectTarget` |
| Increase System Power | `ShipHUD` | `Up` |
| Decrease System Power | `ShipHUD` | `Down` |
| Previous System | `ShipHUD` | `Left` |
| Next System | `ShipHUD` | `Right` |
| Open Scanner | `ShipHUD` | `SHMonocle` |
| Repair | `ShipHUD` | `RepairShip` |
| Ship Alternate Control Hold | `ShipHUD` | `AltHold` |
| Cruise | `ShipHUD` | `Cruise` |
| Cancel | `ShipHUD_Cancel` | `Cancel` |
| Undock / Take-Off | `Spaceship_Interaction` | `TakeOff` |
| Get Up | `Spaceship_Interaction` | `Cancel` |
| Exit Ship From Cockpit | `Spaceship_Interaction` | `ExitShip` |
| Zoom Camera In | `ShipFlightCam_FreeRot` | `FOVZoomIn` |
| Zoom Camera Out | `ShipFlightCam_FreeRot` | `FOVZoomOut` |
| Autopilot On / Off | `ShipHUD_CruiseMode` | `LockCourse` |

### Binary Patch Strategy

Initial implementation should be conservative:

1. Read the whole file as bytes.
2. Parse only recognized records by scanning for ASCII `context\0action\0`.
3. Confirm there are 8 payload bytes after the action terminator.
4. Patch only the key-token bytes once the token mapping is known.
5. Preserve the rest of the payload and file exactly.
6. Write a `.bak` before saving.
7. If parsing confidence fails, refuse to write and show a clear error.

Do not regenerate the entire file until the full format is known.

### Token Mapping

The plugin INI uses SendInput scan codes such as `key:0x14`.

Starfield's control map uses internal key tokens. These are not identical to SendInput scan codes.

Known examples from a generated file:

| Starfield UI Label | Likely token bytes |
| --- | --- |
| Numpad1 | `61 01` |
| Numpad2 | `62 01` |
| Numpad3 | `63 01` |
| Numpad4 | `64 01` |
| Numpad5 | `65 01` |
| Numpad6 | `66 01` |
| Numpad7 | `67 01` |
| Numpad8 | `68 01` |
| Numpad9 | `69 01` |

These mappings must be validated by controlled before/after diffs before the configurator writes them.

## Recommended Workflow

### Save INI Only

Always safe:

1. Update `AbsoluteHOTAS.ini`.
2. Do not touch `ControlMap_Custom.txt`.

### Save INI + Starfield Bindings

Opt-in:

1. Update `AbsoluteHOTAS.ini`.
2. Read `ControlMap_Custom.txt` as bytes.
3. Back it up.
4. Patch recognized spaceship action rows.
5. Preserve unknown rows and unknown sections.
6. Report which actions were patched and which were skipped.

## Safety Rules

- Never write `ControlMap_Custom.txt` as plain text.
- Never normalize line endings in `ControlMap_Custom.txt`.
- Never drop unknown records.
- Never assume INI scan codes equal Starfield control-map tokens.
- Always back up before writing.
- Refuse to write if duplicate records or unexpected section boundaries make the patch ambiguous.
