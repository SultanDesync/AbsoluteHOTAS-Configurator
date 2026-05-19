# AbsoluteHOTAS Ship Button Bindings

AbsoluteHOTAS 1.6 can map DirectInput buttons to Starfield spaceship actions and emit keyboard or mouse outputs through `SendInput`.

The physical button side is configured in `[ShipButtons]`. Each value is a 1-indexed DirectInput button ID from `1..128`; use `-1` to leave an action unbound.

The emitted keyboard/mouse side is configured in `[ShipButtonOutputs]`. If an output is omitted, the plugin uses the vanilla Starfield spaceship default for that action.

| Action | Physical button key | Output key | Vanilla output |
| --- | --- | --- | --- |
| Fire Boosters | `iFireBoostersButton` | `sFireBoostersOutput` | `key:0x2A` |
| Switch Flight Modes | `iSwitchFlightModesButton` | `sSwitchFlightModesOutput` | `key:0x39` |
| Toggle POV | `iTogglePovButton` | `sTogglePovOutput` | `key:0x10` |
| Fire Weapon 0 | `iFireWeapon0Button` | `sFireWeapon0Output` | `mouse:1` |
| Fire Weapon 1 | `iFireWeapon1Button` | `sFireWeapon1Output` | `mouse:2` |
| Fire Weapon 2 | `iFireWeapon2Button` | `sFireWeapon2Output` | `key:0x22` |
| Ship Action 1 | `iShipAction1Button` | `sShipAction1Output` | `key:0x13` |
| Select Target | `iSelectTargetButton` | `sSelectTargetOutput` | `key:0x12` |
| Increase System Power | `iIncreaseSystemPowerButton` | `sIncreaseSystemPowerOutput` | `key:0x48` |
| Decrease System Power | `iDecreaseSystemPowerButton` | `sDecreaseSystemPowerOutput` | `key:0x50` |
| Previous System | `iPreviousSystemButton` | `sPreviousSystemOutput` | `key:0x4B` |
| Next System | `iNextSystemButton` | `sNextSystemOutput` | `key:0x4D` |
| Open Scanner | `iOpenScannerButton` | `sOpenScannerOutput` | `key:0x21` |
| Repair | `iRepairButton` | `sRepairOutput` | `key:0x18` |
| Ship Alternate Control Hold | `iShipAlternateControlHoldButton` | `sShipAlternateControlHoldOutput` | `key:0x38` |
| Cruise | `iCruiseButton` | `sCruiseOutput` | `key:0x14` |
| Cancel | `iCancelButton` | `sCancelOutput` | `none` |
| Undock / Take-Off | `iUndockTakeOffButton` | `sUndockTakeOffOutput` | `key:0x39` |
| Get Up | `iGetUpButton` | `sGetUpOutput` | `key:0x12` |
| Exit Ship From Cockpit | `iExitShipFromCockpitButton` | `sExitShipFromCockpitOutput` | `key:0x2D` |
| Zoom Camera In | `iZoomCameraInButton` | `sZoomCameraInOutput` | `mouse:1` |
| Zoom Camera Out | `iZoomCameraOutButton` | `sZoomCameraOutOutput` | `mouse:2` |
| Autopilot On / Off | `iAutopilotOnOffButton` | `sAutopilotOnOffOutput` | `key:0x39` |

Example:

```ini
[ShipButtons]
iOpenScannerButton = 14
iCancelButton = 15

[ShipButtonOutputs]
sOpenScannerOutput = key:0x21
sCancelOutput = key:0x01
```

For the full keyboard/mouse output table, see [key-output-reference.md](key-output-reference.md).

## Extra Buttons

`[ButtonExpansion]` adds optional raw DirectInput-to-`SendInput` passthrough bindings without adding new named ship actions.

Use this for menu helpers, dialog helpers, or extra cockpit controls that should mirror a physical HOTAS button:

```ini
[ButtonExpansion]
iButton99 = key:0x14
iButton100 = key:0x01
iButton101 = mouse:3
```

`iButton99` means physical DirectInput button 99. Values use the same output formats as `[ShipButtonOutputs]`.

Extra button bindings mirror physical button duration. Pressing button 99 holds `key:0x14`; releasing button 99 releases it.

Invalid keys, buttons outside `1..128`, `none`, and empty outputs are ignored.
