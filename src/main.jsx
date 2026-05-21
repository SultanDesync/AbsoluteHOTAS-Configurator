import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import { axisRows, buildIni, defaults, parseKnownValues, setIniValue } from "./ini";
import { shipActions, outputToStarfieldToken, unusedKeyboardKeys } from "./shipActions";
import iconUrl from "./assets/absolutehotas-icon.svg";
import "./styles.css";

// Modular subcomponents
import { Field, Checkbox } from "./components/FormControls";
import { PathSettings } from "./components/PathSettings";
import { HosasSettings } from "./components/HosasSettings";
import { ExtraButtons } from "./components/ExtraButtons";
import { ShipActionsTable } from "./components/ShipActionsTable";
import { DeviceSummary, AxisRow, RuntimeButtonRow, DigitalAxisButtonRow } from "./components/JoystickBindings";

// Shared utility helpers
import {
  deviceIndex,
  isVJoyDevice,
  collectOutputCollisions,
  axisControlFromUsage,
  buttonControlFromId,
  axisValueChanges,
  buttonValueChanges,
  extraButtonValueChanges,
  deduplicateBindings,
  controlLabel
} from "./components/utils";

const runtimeButtonActions = [
  { id: "Activate", label: "Activate / Force Reset", iniKey: "iActivateButtonId", mode: "pulse" },
  { id: "Deactivate", label: "Deactivate / Stop", iniKey: "iStopButtonId", mode: "pulse" },
  { id: "BoostStandDown", label: "Boost Stand-Down", iniKey: "iBoostButtonId", mode: "hold" }
];

const digitalAxisButtonActions = [
  { id: "DigitalReverse", label: "Digital Reverse", iniKey: "iDigitalReverseButton" },
  { id: "DigitalRollLeft", label: "Digital Roll Left", iniKey: "iDigitalRollLeftButton" },
  { id: "DigitalRollRight", label: "Digital Roll Right", iniKey: "iDigitalRollRightButton" },
  { id: "DigitalStrafeLeft", label: "Digital Strafe Left", iniKey: "iDigitalStrafeLeftButton" },
  { id: "DigitalStrafeRight", label: "Digital Strafe Right", iniKey: "iDigitalStrafeRightButton" },
  { id: "DigitalStrafeUp", label: "Digital Strafe Up", iniKey: "iDigitalStrafeUpButton" },
  { id: "DigitalStrafeDown", label: "Digital Strafe Down", iniKey: "iDigitalStrafeDownButton" }
];

const shipActionMetadata = {
  FireBoosters: { context: "ShipHUD", action: "Boosters" },
  SwitchFlightModes: { context: "ShipHUD", action: "SwitchFlightModes" },
  TogglePov: { context: "ShipHUD", action: "TogglePOV" },
  FireWeapon0: { context: "ShipHUD", action: "WeaponGroup1" },
  FireWeapon1: { context: "ShipHUD", action: "WeaponGroup2" },
  FireWeapon2: { context: "ShipHUD", action: "WeaponGroup3" },
  ShipAction1: { context: "ShipHUD", action: "XButton" },
  SelectTarget: { context: "ShipHUD", action: "SelectTarget" },
  IncreaseSystemPower: { context: "ShipHUD", action: "Up" },
  DecreaseSystemPower: { context: "ShipHUD", action: "Down" },
  PreviousSystem: { context: "ShipHUD", action: "Left" },
  NextSystem: { context: "ShipHUD", action: "Right" },
  OpenScanner: { context: "ShipHUD", action: "SHMonocle" },
  Repair: { context: "ShipHUD", action: "RepairShip" },
  ShipAlternateControlHold: { context: "ShipHUD", action: "AltHold" },
  Cruise: { context: "ShipHUD", action: "Cruise" },
  Cancel: { context: "ShipHUD_Cancel", action: "Cancel" },
  UndockTakeOff: { context: "Spaceship_Interaction", action: "TakeOff" },
  GetUp: { context: "Spaceship_Interaction", action: "Cancel" },
  ExitShipFromCockpit: { context: "Spaceship_Interaction", action: "ExitShip" },
  ZoomCameraIn: { context: "ShipFlightCam_FreeRot", action: "FOVZoomIn" },
  ZoomCameraOut: { context: "ShipFlightCam_FreeRot", action: "FOVZoomOut" },
  AutopilotOnOff: { context: "ShipHUD_CruiseMode", action: "LockCourse" }
};

const browserCodeToScancode = {
  Escape: "key:0x01",
  Digit1: "key:0x02",
  Digit2: "key:0x03",
  Digit3: "key:0x04",
  Digit4: "key:0x05",
  Digit5: "key:0x06",
  Digit6: "key:0x07",
  Digit7: "key:0x08",
  Digit8: "key:0x09",
  Digit9: "key:0x0A",
  Digit0: "key:0x0B",
  Minus: "key:0x0C",
  Equal: "key:0x0D",
  Backspace: "key:0x0E",
  Tab: "key:0x0F",
  KeyQ: "key:0x10",
  KeyW: "key:0x11",
  KeyE: "key:0x12",
  KeyR: "key:0x13",
  KeyT: "key:0x14",
  KeyY: "key:0x15",
  KeyU: "key:0x16",
  KeyI: "key:0x17",
  KeyO: "key:0x18",
  KeyP: "key:0x19",
  BracketLeft: "key:0x1A",
  BracketRight: "key:0x1B",
  Enter: "key:0x1C",
  ControlLeft: "key:0x1D",
  KeyA: "key:0x1E",
  KeyS: "key:0x1F",
  KeyD: "key:0x20",
  KeyF: "key:0x21",
  KeyG: "key:0x22",
  KeyH: "key:0x23",
  KeyJ: "key:0x24",
  KeyK: "key:0x25",
  KeyL: "key:0x26",
  Semicolon: "key:0x27",
  Quote: "key:0x28",
  Backquote: "key:0x29",
  ShiftLeft: "key:0x2A",
  Backslash: "key:0x2B",
  KeyZ: "key:0x2C",
  KeyX: "key:0x2D",
  KeyC: "key:0x2E",
  KeyV: "key:0x2F",
  KeyB: "key:0x30",
  KeyN: "key:0x31",
  KeyM: "key:0x32",
  Comma: "key:0x33",
  Period: "key:0x34",
  Slash: "key:0x35",
  ShiftRight: "key:0x36",
  NumpadMultiply: "key:0x37",
  AltLeft: "key:0x38",
  Space: "key:0x39",
  CapsLock: "key:0x3A",
  F1: "key:0x3B",
  F2: "key:0x3C",
  F3: "key:0x3D",
  F4: "key:0x3E",
  F5: "key:0x3F",
  F6: "key:0x40",
  F7: "key:0x41",
  F8: "key:0x42",
  F9: "key:0x43",
  F10: "key:0x44",
  NumLock: "key:0x45",
  ScrollLock: "key:0x46",
  Numpad7: "key:0x47",
  ArrowUp: "key:0x48",
  Numpad9: "key:0x49",
  NumpadSubtract: "key:0x4A",
  ArrowLeft: "key:0x4B",
  Numpad5: "key:0x4C",
  ArrowRight: "key:0x4D",
  NumpadAdd: "key:0x4E",
  Numpad1: "key:0x4F",
  ArrowDown: "key:0x50",
  Numpad3: "key:0x51",
  Numpad0: "key:0x52",
  NumpadDecimal: "key:0x53",
  F11: "key:0x57",
  F12: "key:0x58"
};

function App() {
  const [config, setConfig] = useState(defaults);
  const [loadedIni, setLoadedIni] = useState("");
  const [iniPath, setIniPath] = useState("");
  const [inventory, setInventory] = useState([]);
  const [status, setStatus] = useState("Ready");
  const [listening, setListening] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showAutoMapConfirm, setShowAutoMapConfirm] = useState(false);
  const preview = useMemo(() => buildIni(config, loadedIni), [config, loadedIni]);
  const vjoyDevice = useMemo(() => inventory.find(isVJoyDevice) ?? null, [inventory]);
  const outputCollisions = useMemo(() => collectOutputCollisions(config), [config]);

  const [controlMapPath, setControlMapPath] = useState("");
  const outputBindings = useMemo(() => {
    return Object.fromEntries(
      shipActions.map((action) => [
        action.id,
        config[action.outputIniKey] ?? action.outputs.main?.value ?? "none"
      ])
    );
  }, [config]);
  const [recordingActionId, setRecordingActionId] = useState(null);
  const [axesOpen, setAxesOpen] = useState(true);
  const [runtimeOpen, setRuntimeOpen] = useState(true);
  const [digitalOpen, setDigitalOpen] = useState(true);

  useEffect(() => {
    invoke("default_control_map_path")
      .then((path) => {
        if (path) {
          setControlMapPath(path);
        }
      })
      .catch((err) => {
        console.error("Failed to resolve default ControlMap path:", err);
      });

    invoke("default_ini_path")
      .then((path) => {
        setIniPath(path);
        if (path) {
          invoke("read_ini", { path })
            .then((text) => {
              setLoadedIni(text);
              setConfig((current) => ({ ...current, ...parseKnownValues(text) }));
              setStatus("Loaded existing configuration");
            })
            .catch((err) => {
              const errStr = String(err);
              if (
                errStr.includes("entity not found") ||
                errStr.includes("cannot find the file") ||
                errStr.includes("No such file")
              ) {
                setStatus("Ready (using defaults)");
              } else {
                setStatus(`Load failed: ${errStr}`);
              }
            });
        }
      })
      .catch((error) => setStatus(String(error)));
    refreshInventory();
  }, []);

  useEffect(() => {
    if (recordingActionId === null) return;

    const handleKeyDown = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const code = event.code;
      const scancode = browserCodeToScancode[code];
      if (scancode) {
        const action = shipActions.find((item) => item.id === recordingActionId);
        if (action) {
          applyChanges({ [action.outputIniKey]: scancode });
        }
        setStatus(`Recorded output binding: ${scancode} for ${recordingActionId}`);
      } else {
        setStatus(`Unsupported key: ${code}`);
      }
      setRecordingActionId(null);
    };

    const handleMouseDown = (event) => {
      event.preventDefault();
      event.stopPropagation();
      let outputVal = "none";
      if (event.button === 0) outputVal = "mouse:1";
      else if (event.button === 2) outputVal = "mouse:2";
      else if (event.button === 1) outputVal = "mouse:3";
      else if (event.button === 3) outputVal = "mouse:4";

      if (outputVal !== "none") {
        const action = shipActions.find((item) => item.id === recordingActionId);
        if (action) {
          applyChanges({ [action.outputIniKey]: outputVal });
        }
        setStatus(`Recorded output binding: ${outputVal} for ${recordingActionId}`);
      }
      setRecordingActionId(null);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("mousedown", handleMouseDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("mousedown", handleMouseDown, true);
    };
  }, [recordingActionId]);

  function applyChanges(changes) {
    setConfig((current) => ({ ...current, ...changes }));
  }

  function handleHosasModeChange(key, value) {
    if (key === "bIncrementalThrottleMode" && value === true) {
      applyChanges({
        bIncrementalThrottleMode: true,
        bIncrementalKeyboardMode: false
      });
    } else if (key === "bIncrementalKeyboardMode" && value === true) {
      applyChanges({
        bIncrementalThrottleMode: false,
        bIncrementalKeyboardMode: true
      });
    } else {
      applyChanges({ [key]: value });
    }
  }

  function handleRecordSecondary(actionId) {
    if (recordingActionId === actionId) {
      setRecordingActionId(null);
    } else {
      setRecordingActionId(actionId);
      setStatus(`Press any key or mouse button to set output for ${actionId}...`);
    }
  }

  function handleChangeSecondary(actionId, value) {
    const action = shipActions.find((item) => item.id === actionId);
    if (!action) return;
    applyChanges({ [action.outputIniKey]: value });
  }

  async function browseIniPath() {
    try {
      const selected = await invoke("select_file", {
        filterName: "AbsoluteHOTAS INI",
        filterExt: "ini",
        title: "Select AbsoluteHOTAS.ini"
      });
      if (selected) {
        setIniPath(selected);
        setStatus("Selected AbsoluteHOTAS.ini path");
      }
    } catch (error) {
      setStatus(`Browse failed: ${error}`);
    }
  }

  async function browseControlMapPath() {
    try {
      const selected = await invoke("select_file", {
        filterName: "Starfield ControlMap",
        filterExt: "txt",
        title: "Select ControlMap_Custom.txt"
      });
      if (selected) {
        setControlMapPath(selected);
        setStatus("Selected ControlMap_Custom.txt path");
      }
    } catch (error) {
      setStatus(`Browse failed: ${error}`);
    }
  }

  function updateExtraButton(nextRow) {
    setConfig((current) => ({
      ...current,
      buttonExpansion: (current.buttonExpansion ?? []).map((row) =>
        row.id === nextRow.id ? nextRow : row
      )
    }));
  }

  function addExtraButton() {
    setConfig((current) => ({
      ...current,
      buttonExpansion: [
        ...(current.buttonExpansion ?? []),
        { id: `extra-${Date.now()}`, button: "", output: "none" }
      ]
    }));
  }

  function removeExtraButton(id) {
    setConfig((current) => ({
      ...current,
      buttonExpansion: (current.buttonExpansion ?? []).filter((row) => row.id !== id)
    }));
  }

  async function refreshInventory() {
    try {
      const result = await invoke("list_directinput_inventory");
      setInventory(result);
      const device = result.find(isVJoyDevice);
      setStatus(device ? `Using ${device.name}` : "No vJoy device found");
    } catch (error) {
      setStatus(`Inventory failed: ${error}`);
    }
  }

  async function loadIni() {
    try {
      const text = await invoke("read_ini", { path: iniPath });
      setLoadedIni(text);
      setConfig((current) => ({ ...current, ...parseKnownValues(text) }));
      setStatus("Loaded active game configuration");
    } catch (error) {
      setStatus(`Load failed: ${error}`);
    }
  }

  async function loadBackup() {
    try {
      const selected = await invoke("select_file", {
        filterName: "AbsoluteHOTAS INI Backup",
        filterExt: "ini",
        title: "Load Backup Profile"
      });
      if (selected) {
        const text = await invoke("read_ini", { path: selected });
        setLoadedIni(text);
        const parsed = parseKnownValues(text);
        setConfig((current) => ({ ...current, ...parsed }));
        setStatus(`Loaded backup profile: "${parsed.sProfileName || "Unnamed"}"`);
      }
    } catch (error) {
      setStatus(`Load backup failed: ${error}`);
    }
  }

  async function createBackup() {
    try {
      const selected = await invoke("select_save_file", {
        filterName: "AbsoluteHOTAS INI Backup",
        filterExt: "ini",
        title: "Create Backup Profile"
      });
      if (selected) {
        await invoke("write_ini", { path: selected, contents: preview });
        setStatus(`Created backup profile: "${config.sProfileName || "Unnamed"}"`);
      }
    } catch (error) {
      setStatus(`Backup failed: ${error}`);
    }
  }

  function handleAutoMapUnused() {
    setShowAutoMapConfirm(true);
  }

  function confirmAutoMap() {
    const changes = {};
    shipActions.forEach((action, index) => {
      if (index < unusedKeyboardKeys.length) {
        changes[action.outputIniKey] = unusedKeyboardKeys[index];
      }
    });
    applyChanges(changes);
    setShowAutoMapConfirm(false);
    setStatus("Auto-mapped secondary controls to unused keyboard keys. Click 'Save Config' to apply.");
  }


  async function saveIni() {
    try {
      // 1. Write the INI file
      await invoke("write_ini", { path: iniPath, contents: preview });
      setLoadedIni(preview);

      // 2. Generate and write the binary ControlMap_Custom.txt
      const rawBindings = shipActions
        .flatMap((action) => {
          const meta = shipActionMetadata[action.id];
          if (!meta) return [];

          const defaultOutput = action.outputs.main?.value ?? "none";
          const secondaryVal = outputBindings[action.id] ?? defaultOutput;

          // Default output uses Starfield's vanilla binding. Custom output must
          // be reflected into ControlMap_Custom.txt so the emitted key triggers
          // the same action in game.
          if (secondaryVal.toLowerCase() === defaultOutput.toLowerCase()) {
            return [];
          }

          const secondaryTokenInfo = outputToStarfieldToken(secondaryVal);

          return [
            {
              context: meta.context,
              action: meta.action,
              device: secondaryTokenInfo.device,
              token: secondaryTokenInfo.token,
              is_secondary: true
            }
          ];
        });

      const cleanBindings = deduplicateBindings(rawBindings);
      await invoke("write_control_map", { filePath: controlMapPath, bindings: cleanBindings });

      // 3. Update/write StarfieldCustom.ini with the spaceship throttle setting
      let starfieldIniWritten = false;
      try {
        const lastSlash = Math.max(controlMapPath.lastIndexOf('\\'), controlMapPath.lastIndexOf('/'));
        const starfieldIniPath = lastSlash !== -1
          ? controlMapPath.substring(0, lastSlash + 1) + 'StarfieldCustom.ini'
          : 'StarfieldCustom.ini';

        let starfieldIniContent = "";
        try {
          starfieldIniContent = await invoke("read_ini", { path: starfieldIniPath });
        } catch (e) {
          // File doesn't exist or couldn't be read, which is fine; we will write a new one
        }

        const updatedIniContent = setIniValue(starfieldIniContent || "", "Spaceship", "fThrottleAtEngineStart", "0.0314");
        if (updatedIniContent !== starfieldIniContent) {
          await invoke("write_ini", { path: starfieldIniPath, contents: updatedIniContent });
          starfieldIniWritten = true;
        }
      } catch (err) {
        console.error("Failed to update StarfieldCustom.ini:", err);
      }

      if (starfieldIniWritten) {
        setStatus("Saved INI, ControlMap & StarfieldCustom.ini successfully");
      } else {
        setStatus("Saved INI & ControlMap successfully (StarfieldCustom.ini verified)");
      }
    } catch (error) {
      setStatus(`Save failed: ${error}`);
    }
  }

  async function listenFor(kind, target) {
    if (!vjoyDevice) {
      setStatus("No vJoy device available");
      return;
    }

    const targetKey = `${kind}:${target.axis ?? target.id}`;
    const targetLabel = target.title ?? target.label ?? "extra button";
    setListening(targetKey);
    setStatus(`Binding ${targetLabel}`);

    try {
      const deviceIndices = [deviceIndex(vjoyDevice)];
      if (kind === "axis") {
        setStatus(`Arming ${targetLabel}; move after a brief pause`);
        const recorded = await invoke("record_directinput_axis_from_devices", {
          deviceIndices,
          timeoutMs: 12000,
          preferredUsageId: null
        });
        const control = axisControlFromUsage(vjoyDevice, recorded.usage_id ?? recorded.usageId);
        applyChanges(axisValueChanges(target, control));
        setStatus(`${targetLabel}: ${controlLabel(control)}`);
        return;
      }

      setStatus(`Armed ${targetLabel}; press one vJoy button`);
      const recorded = await invoke("record_directinput_button_from_devices", {
        deviceIndices,
        timeoutMs: 12000
      });
      const control = buttonControlFromId(vjoyDevice, recorded.button_id ?? recorded.buttonId);
      if (target.id && String(target.id).startsWith("extra-")) {
        updateExtraButton(extraButtonValueChanges(target, control));
      } else {
        applyChanges(buttonValueChanges(target, control));
      }
      setStatus(`${targetLabel}: ${controlLabel(control)}`);
    } catch (error) {
      setStatus(`Bind failed for ${targetLabel}; unchanged (${error})`);
    } finally {
      setListening("");
    }
  }

  async function testShipOutput(action, output) {
    if (!output) return;
    try {
      await invoke("emit_ship_output", { output, mode: action.mode });
      setStatus(`${action.label} emitted`);
    } catch (error) {
      setStatus(`Emit failed: ${error}`);
    }
  }

  async function testExtraOutput(row, output) {
    if (!output) return;
    try {
      await invoke("emit_ship_output", { output, mode: "hold" });
      setStatus(`Extra button ${row.button || ""} emitted`);
    } catch (error) {
      setStatus(`Emit failed: ${error}`);
    }
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <img src={iconUrl} alt="" aria-hidden="true" />
          <div>
            <p className="eyebrow">AbsoluteHOTAS</p>
            <h1>Configurator</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <button type="button" onClick={() => setPreviewOpen((open) => !open)}>
            {previewOpen ? "Hide INI" : "Show INI"}
          </button>
          <div className="status">{status}</div>
        </div>
      </header>

      <PathSettings
        iniPath={iniPath}
        setIniPath={setIniPath}
        controlMapPath={controlMapPath}
        setControlMapPath={setControlMapPath}
        browseIniPath={browseIniPath}
        browseControlMapPath={browseControlMapPath}
        loadIni={loadIni}
        saveIni={saveIni}
        profileName={config.sProfileName ?? "Default"}
        setProfileName={(val) => applyChanges({ sProfileName: val })}
        loadBackup={loadBackup}
        createBackup={createBackup}
      />

      <section className={`layout ${previewOpen ? "preview-open" : ""}`}>
        <div className="stack">
          <DeviceSummary device={vjoyDevice} inventory={inventory} onRefresh={refreshInventory} />

          <section className="panel">
            <div className="section-header">
              <h2>Flight Axes</h2>
              <button type="button" onClick={() => setAxesOpen(!axesOpen)}>
                {axesOpen ? "Collapse" : "Expand"}
              </button>
            </div>
            {axesOpen && (
              <div className="binding-list">
                {axisRows.map((row) => (
                  <AxisRow
                    key={row.axis}
                    row={row}
                    config={config}
                    device={vjoyDevice}
                    listening={listening}
                    onChange={applyChanges}
                    onListen={listenFor}
                  />
                ))}
              </div>
            )}
          </section>

          <HosasSettings
            config={config}
            applyChanges={applyChanges}
            handleHosasModeChange={handleHosasModeChange}
          />

          <section className="panel">
            <div className="section-header">
              <h2>Runtime Control</h2>
              <button type="button" onClick={() => setRuntimeOpen(!runtimeOpen)}>
                {runtimeOpen ? "Collapse" : "Expand"}
              </button>
            </div>
            {runtimeOpen && (
              <div className="binding-list">
                {runtimeButtonActions.map((action) => (
                  <RuntimeButtonRow
                    key={action.id}
                    action={action}
                    config={config}
                    device={vjoyDevice}
                    listening={listening}
                    onChange={applyChanges}
                    onListen={listenFor}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="section-header">
              <h2>Digital Axis Substitutes</h2>
              <button type="button" onClick={() => setDigitalOpen(!digitalOpen)}>
                {digitalOpen ? "Collapse" : "Expand"}
              </button>
            </div>
            {digitalOpen && (
              <>
                <div className="binding-list">
                  {digitalAxisButtonActions.map((action) => (
                    <DigitalAxisButtonRow
                      key={action.id}
                      action={action}
                      config={config}
                      device={vjoyDevice}
                      listening={listening}
                      onChange={applyChanges}
                      onListen={listenFor}
                    />
                  ))}
                </div>
                <div className="grid four digital-values">
                  <Field
                    label="Digital roll value"
                    name="fDigitalRollValue"
                    value={config.fDigitalRollValue}
                    onChange={(key, value) => applyChanges({ [key]: value })}
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                  />
                  <Field
                    label="Digital strafe value"
                    name="fDigitalStrafeValue"
                    value={config.fDigitalStrafeValue}
                    onChange={(key, value) => applyChanges({ [key]: value })}
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                  />
                </div>
              </>
            )}
          </section>

          <ShipActionsTable
            config={config}
            vjoyDevice={vjoyDevice}
            listening={listening}
            outputCollisions={outputCollisions}
            applyChanges={applyChanges}
            listenFor={listenFor}
            testShipOutput={testShipOutput}
            secondaryBindings={outputBindings}
            handleChangeSecondary={handleChangeSecondary}
            recordingActionId={recordingActionId}
            handleRecordSecondary={handleRecordSecondary}
            onAutoMapUnused={handleAutoMapUnused}
          />

          <ExtraButtons
            config={config}
            vjoyDevice={vjoyDevice}
            listening={listening}
            outputCollisions={outputCollisions}
            updateExtraButton={updateExtraButton}
            addExtraButton={addExtraButton}
            removeExtraButton={removeExtraButton}
            listenFor={listenFor}
            testExtraOutput={testExtraOutput}
          />
        </div>

        {previewOpen ? (
          <aside className="panel preview-panel">
            <div className="preview-header">
              <h2>INI Preview</h2>
              <button
                type="button"
                onClick={() => {
                  setLoadedIni("");
                  setConfig(defaults);
                  setStatus("Defaults restored");
                }}
              >
                Defaults
              </button>
            </div>
            <textarea value={preview} readOnly spellCheck="false" />
          </aside>
        ) : null}
      </section>

      {showAutoMapConfirm && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">⚡ Auto-Map Unused Keys</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAutoMapConfirm(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>
                This will automatically assign <strong>23 completely unused, safe secondary keyboard keys</strong> (such as <code>Numpad 7</code>, <code>[</code>, <code>;</code>, etc.) to all spaceship actions in your configurations.
              </p>
              <p>
                Once saved, this decouples your spaceship controls from on-foot controls, preventing double-binding conflicts and allowing single-function physical bindings on your HOTAS device.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowAutoMapConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={confirmAutoMap}
                style={{ marginLeft: "10px" }}
              >
                Confirm & Auto-Map
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
