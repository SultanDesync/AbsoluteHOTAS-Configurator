import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import { axisRows, buildIni, defaults, normalizeAxisControlId, parseKnownValues } from "./ini";
import { outputCatalog, outputFromValue, outputLabel, outputOptionsForAction, shipActions } from "./shipActions";
import iconUrl from "./assets/absolutehotas-icon.svg";
import "./styles.css";

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

function Field({ label, name, value, onChange, type = "text", ...props }) {
  return (
    <label>
      {label}
      <input name={name} type={type} value={value} onChange={(event) => onChange(name, event.target.value)} {...props} />
    </label>
  );
}

function Checkbox({ label, name, checked, onChange }) {
  return (
    <label className="check">
      <input name={name} type="checkbox" checked={checked} onChange={(event) => onChange(name, event.target.checked)} />
      {label}
    </label>
  );
}

function deviceIndex(device) {
  return device.enumeration_index ?? device.enumerationIndex ?? 0;
}

function isVJoyDevice(device) {
  const text = `${device.name ?? ""} ${device.instance_name ?? ""} ${device.product_name ?? ""}`.toLowerCase();
  return text.includes("vjoy");
}

function controlsFor(device, kind) {
  return (device?.controls ?? []).filter((control) => control.kind === kind);
}

function controlLabel(control) {
  if (!control) return "Unbound";
  const objectName = control.name && control.name !== control.label ? ` - ${control.name}` : "";
  return `${control.label}${objectName}`;
}

function axisBindingLabel(device, value) {
  const control = selectedControl(device, "axis", value);
  return control ? controlLabel(control) : `Current INI value: ${value}`;
}

function controlKey(control) {
  return `${control.kind}:${control.id}:${control.offset ?? ""}:${control.instance ?? ""}`;
}

function selectedControl(device, kind, value) {
  return controlsFor(device, kind).find((control) => String(control.id).toLowerCase() === String(value).toLowerCase()) ?? null;
}

function axisValueChanges(row, control) {
  return control ? { [row.axis]: normalizeAxisControlId(control.id) } : {};
}

function buttonValueChanges(action, control) {
  return { [action.iniKey]: control ? String(control.id) : "-1" };
}

function defaultOutputValue(action) {
  return action.outputs.main?.value ?? "none";
}

function normalizedOutputValue(value) {
  return String(value ?? "none").trim().toLowerCase();
}

function outputInstruction(action, selectedOutputValue) {
  const output = outputFromValue(action, selectedOutputValue);
  const selected = outputLabel(output);
  const vanilla = outputLabel(action.outputs.main);
  const defaultValue = defaultOutputValue(action);
  const isVanilla = normalizedOutputValue(selectedOutputValue) === normalizedOutputValue(defaultValue);

  if (!action.outputs.main) {
    return selectedOutputValue && normalizedOutputValue(selectedOutputValue) !== "none"
      ? `Bind Starfield ${action.label} to ${selected}`
      : "No vanilla binding; choose an output and bind Starfield to match";
  }

  if (isVanilla) {
    return `Starfield default: ${vanilla}`;
  }

  if (normalizedOutputValue(selectedOutputValue) === "none") {
    return `No plugin output; Starfield ${action.label} will not receive a key`;
  }

  return `Bind Starfield ${action.label} to ${selected}`;
}

function collectOutputCollisions(config) {
  const shipRows = shipActions.map((action) => ({
    id: action.id,
    label: action.label,
    value: normalizedOutputValue(config[action.outputIniKey]),
    defaultValue: normalizedOutputValue(defaultOutputValue(action)),
    section: "ship"
  }));
  const extraRows = config.buttonExpansion.map((row) => ({
    id: row.id,
    label: row.button ? `Extra Button ${row.button}` : "Extra Button",
    value: normalizedOutputValue(row.output),
    defaultValue: "none",
    section: "extra"
  }));
  const rows = [...shipRows, ...extraRows].filter((row) => row.value && row.value !== "none");
  const byOutput = rows.reduce((map, row) => {
    const items = map.get(row.value) ?? [];
    items.push(row);
    map.set(row.value, items);
    return map;
  }, new Map());
  const vanillaByOutput = shipRows.reduce((map, row) => {
    if (row.defaultValue && row.defaultValue !== "none") {
      const items = map.get(row.defaultValue) ?? [];
      items.push(row);
      map.set(row.defaultValue, items);
    }
    return map;
  }, new Map());

  return { byOutput, vanillaByOutput };
}

function extraButtonValueChanges(row, control) {
  return {
    ...row,
    button: control ? String(control.id) : ""
  };
}

function axisControlFromUsage(device, usageId) {
  return controlsFor(device, "axis").find((control) => String(control.id).toLowerCase() === String(usageId).toLowerCase()) ?? {
    kind: "axis",
    id: normalizeAxisControlId(usageId),
    label: normalizeAxisControlId(usageId)
  };
}

function buttonControlFromId(device, buttonId) {
  return controlsFor(device, "button").find((control) => String(control.id) === String(buttonId)) ?? {
    kind: "button",
    id: String(buttonId),
    label: `Button ${buttonId}`
  };
}

function DeviceSummary({ device, inventory, onRefresh }) {
  const axes = controlsFor(device, "axis").length;
  const buttons = controlsFor(device, "button").length;
  const allDevices = inventory.length;

  return (
    <section className="panel device-panel">
      <div className="section-header">
        <h2>vJoy Device</h2>
        <button type="button" onClick={onRefresh}>Refresh</button>
      </div>
      {device ? (
        <div className="device-line">
          <strong>{deviceIndex(device)}: {device.name}</strong>
          <span>{axes} axes / {buttons} buttons</span>
        </div>
      ) : (
        <div className="empty">No vJoy DirectInput device found. DirectInput devices seen: {allDevices}</div>
      )}
    </section>
  );
}

function AxisRow({ row, config, device, listening, onChange, onListen }) {
  const control = selectedControl(device, "axis", config[row.axis]);

  return (
    <div className="binding-row axis-row">
      <div>
        <strong>{row.title}</strong>
        <span>{axisBindingLabel(device, config[row.axis])}</span>
      </div>
      <select value={control ? control.id : ""} onChange={(event) => onChange(axisValueChanges(row, controlsFor(device, "axis").find((item) => item.id === event.target.value)))}>
        <option value="" disabled>{device ? "Choose vJoy axis" : "No vJoy device"}</option>
        {controlsFor(device, "axis").map((item) => (
          <option key={controlKey(item)} value={item.id}>{controlLabel(item)}</option>
        ))}
      </select>
      {row.sens ? <Field label="Sensitivity" name={row.sens} value={config[row.sens]} onChange={(key, value) => onChange({ [key]: value })} type="number" min="0" max="5" step="0.05" /> : <div />}
      {row.invert ? <Checkbox label="Invert" name={row.invert} checked={config[row.invert]} onChange={(key, value) => onChange({ [key]: value })} /> : <div />}
      <button type="button" onClick={() => onListen("axis", row)} disabled={!device || Boolean(listening)}>
        {listening === `axis:${row.axis}` ? "Binding" : "Bind"}
      </button>
    </div>
  );
}

function RuntimeButtonRow({ action, config, device, listening, onChange, onListen }) {
  const control = selectedControl(device, "button", config[action.iniKey]);

  return (
    <div className="binding-row runtime-row">
      <div>
        <strong>{action.label}</strong>
        <span>{controlLabel(control)}</span>
      </div>
      <select value={control ? control.id : ""} onChange={(event) => onChange(buttonValueChanges(action, controlsFor(device, "button").find((item) => item.id === event.target.value)))}>
        <option value="">Unbound</option>
        {controlsFor(device, "button").map((item) => (
          <option key={controlKey(item)} value={item.id}>{controlLabel(item)}</option>
        ))}
      </select>
      <button type="button" onClick={() => onListen("button", action)} disabled={!device || Boolean(listening)}>
        {listening === `button:${action.id}` ? "Binding" : "Bind"}
      </button>
    </div>
  );
}

function DigitalAxisButtonRow({ action, config, device, listening, onChange, onListen }) {
  const control = selectedControl(device, "button", config[action.iniKey]);

  return (
    <div className="binding-row runtime-row">
      <div>
        <strong>{action.label}</strong>
        <span>{control ? controlLabel(control) : config[action.iniKey] === "-1" ? "Unbound" : `Current INI value: ${config[action.iniKey]}`}</span>
      </div>
      <select value={control ? control.id : ""} onChange={(event) => onChange(buttonValueChanges(action, controlsFor(device, "button").find((item) => item.id === event.target.value)))}>
        <option value="">Unbound</option>
        {controlsFor(device, "button").map((item) => (
          <option key={controlKey(item)} value={item.id}>{controlLabel(item)}</option>
        ))}
      </select>
      <button type="button" onClick={() => onListen("button", action)} disabled={!device || Boolean(listening)}>
        {listening === `button:${action.id}` ? "Binding" : "Bind"}
      </button>
    </div>
  );
}

function ShipActionRow({ action, config, device, listening, collisions, onChange, onListen, onTest }) {
  const control = selectedControl(device, "button", config[action.iniKey]);
  const output = outputFromValue(action, config[action.outputIniKey]);
  const outputOptions = outputOptionsForAction(action);
  const selectedOutputValue = output?.value ?? config[action.outputIniKey] ?? "none";
  const defaultValue = defaultOutputValue(action);
  const hasVanillaOutput = normalizedOutputValue(defaultValue) !== "none";
  const usesVanillaOutput = hasVanillaOutput && normalizedOutputValue(selectedOutputValue) === normalizedOutputValue(defaultValue);
  const matchingRows = collisions.byOutput.get(normalizedOutputValue(selectedOutputValue)) ?? [];
  const duplicateRows = matchingRows.filter((row) => row.id !== action.id);
  const vanillaRows = (collisions.vanillaByOutput.get(normalizedOutputValue(selectedOutputValue)) ?? [])
    .filter((row) => row.id !== action.id);
  const hasCatalogValue = selectedOutputValue === "none" ||
    outputOptions.some((item) => item.value.toLowerCase() === String(selectedOutputValue).toLowerCase());

  return (
    <div className="binding-row ship-row">
      <div>
        <strong>{action.label}</strong>
        <span>{action.mode} / plugin output: {outputLabel(output)}</span>
        <span className={usesVanillaOutput ? "hint" : "notice"}>{outputInstruction(action, selectedOutputValue)}</span>
        {duplicateRows.length ? (
          <span className="warning">Also emitted by {duplicateRows.map((row) => row.label).join(", ")}</span>
        ) : null}
        {!usesVanillaOutput && vanillaRows.length ? (
          <span className="warning">Vanilla output for {vanillaRows.map((row) => row.label).join(", ")}</span>
        ) : null}
      </div>
      <select value={control ? control.id : ""} onChange={(event) => onChange(buttonValueChanges(action, controlsFor(device, "button").find((item) => item.id === event.target.value)))}>
        <option value="">Unbound</option>
        {controlsFor(device, "button").map((item) => (
          <option key={controlKey(item)} value={item.id}>{controlLabel(item)}</option>
        ))}
      </select>
      <div className="output-cell">
        {hasVanillaOutput ? (
          <Checkbox
            label="Vanilla output"
            name={`${action.id}VanillaOutput`}
            checked={usesVanillaOutput}
            onChange={(_, checked) => onChange({
              [action.outputIniKey]: checked ? defaultValue : action.outputs.alt?.value ?? "none"
            })}
          />
        ) : (
          <span className="output-note">Custom output required</span>
        )}
        <select
          value={selectedOutputValue}
          onChange={(event) => onChange({ [action.outputIniKey]: event.target.value })}
          disabled={usesVanillaOutput}
        >
          <option value="none">No output</option>
          {!hasCatalogValue ? <option value={selectedOutputValue}>Current: {selectedOutputValue}</option> : null}
          {outputOptions.map((item) => (
            <option key={`${action.id}:${item.value}`} value={item.value}>
              {item.isDefault ? "Default: " : ""}{item.label}
            </option>
          ))}
        </select>
      </div>
      <button type="button" onClick={() => onListen("button", action)} disabled={!device || Boolean(listening)}>
        {listening === `button:${action.id}` ? "Binding" : "Bind"}
      </button>
      <button type="button" onClick={() => onTest(action, output)} disabled={!output}>Test</button>
    </div>
  );
}

function ExtraButtonRow({ row, device, listening, collisions, onChange, onRemove, onListen, onTest }) {
  const control = selectedControl(device, "button", row.button);
  const outputAction = { outputs: { main: null, alt: null } };
  const output = outputFromValue(outputAction, row.output);
  const selectedOutputValue = output?.value ?? row.output ?? "none";
  const matchingRows = collisions.byOutput.get(normalizedOutputValue(selectedOutputValue)) ?? [];
  const duplicateRows = matchingRows.filter((item) => item.id !== row.id);
  const vanillaRows = collisions.vanillaByOutput.get(normalizedOutputValue(selectedOutputValue)) ?? [];
  const hasCatalogValue = selectedOutputValue === "none" ||
    outputCatalog.some((item) => item.value.toLowerCase() === String(selectedOutputValue).toLowerCase());

  return (
    <div className="binding-row extra-row">
      <div>
        <strong>Extra Button</strong>
        <span>{control ? controlLabel(control) : row.button ? `Button ${row.button}` : "Unbound"} / plugin output: {outputLabel(output)}</span>
        {duplicateRows.length ? (
          <span className="warning">Also emitted by {duplicateRows.map((item) => item.label).join(", ")}</span>
        ) : null}
        {vanillaRows.length ? (
          <span className="warning">Vanilla output for {vanillaRows.map((item) => item.label).join(", ")}</span>
        ) : null}
      </div>
      <select value={control ? control.id : ""} onChange={(event) => onChange(extraButtonValueChanges(row, controlsFor(device, "button").find((item) => item.id === event.target.value)))}>
        <option value="">Unbound</option>
        {controlsFor(device, "button").map((item) => (
          <option key={controlKey(item)} value={item.id}>{controlLabel(item)}</option>
        ))}
      </select>
      <select value={selectedOutputValue} onChange={(event) => onChange({ ...row, output: event.target.value })}>
        <option value="none">No output</option>
        {!hasCatalogValue ? <option value={selectedOutputValue}>Current: {selectedOutputValue}</option> : null}
        {outputCatalog.map((item) => (
          <option key={`${row.id}:${item.value}`} value={item.value}>{item.label}</option>
        ))}
      </select>
      <button type="button" onClick={() => onListen("button", row)} disabled={!device || Boolean(listening)}>
        {listening === `button:${row.id}` ? "Binding" : "Bind"}
      </button>
      <button type="button" onClick={() => onTest(row, output)} disabled={!output}>Test</button>
      <button type="button" onClick={() => onRemove(row.id)}>Remove</button>
    </div>
  );
}

function App() {
  const [config, setConfig] = useState(defaults);
  const [loadedIni, setLoadedIni] = useState("");
  const [iniPath, setIniPath] = useState("");
  const [inventory, setInventory] = useState([]);
  const [status, setStatus] = useState("Ready");
  const [listening, setListening] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const preview = useMemo(() => buildIni(config, loadedIni), [config, loadedIni]);
  const vjoyDevice = useMemo(() => inventory.find(isVJoyDevice) ?? null, [inventory]);
  const outputCollisions = useMemo(() => collectOutputCollisions(config), [config]);

  useEffect(() => {
    invoke("default_ini_path").then(setIniPath).catch((error) => setStatus(String(error)));
    refreshInventory();
  }, []);

  function applyChanges(changes) {
    setConfig((current) => ({ ...current, ...changes }));
  }

  function updateExtraButton(nextRow) {
    setConfig((current) => ({
      ...current,
      buttonExpansion: current.buttonExpansion.map((row) => row.id === nextRow.id ? nextRow : row)
    }));
  }

  function addExtraButton() {
    setConfig((current) => ({
      ...current,
      buttonExpansion: [
        ...current.buttonExpansion,
        { id: `extra-${Date.now()}`, button: "", output: "none" }
      ]
    }));
  }

  function removeExtraButton(id) {
    setConfig((current) => ({
      ...current,
      buttonExpansion: current.buttonExpansion.filter((row) => row.id !== id)
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
      setStatus("Loaded");
    } catch (error) {
      setStatus(`Load failed: ${error}`);
    }
  }

  async function saveIni() {
    try {
      await invoke("write_ini", { path: iniPath, contents: preview });
      setLoadedIni(preview);
      setStatus("Saved");
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

      <section className="path-row">
        <label htmlFor="iniPath">INI path</label>
        <input id="iniPath" value={iniPath} onChange={(event) => setIniPath(event.target.value)} spellCheck="false" />
        <button type="button" onClick={loadIni}>Load</button>
        <button type="button" onClick={saveIni}>Save</button>
      </section>

      <section className={`layout ${previewOpen ? "preview-open" : ""}`}>
        <div className="stack">
          <DeviceSummary device={vjoyDevice} inventory={inventory} onRefresh={refreshInventory} />

          <section className="panel">
            <h2>Flight Axes</h2>
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
          </section>

          <section className="panel">
            <h2>Calibration</h2>
            <div className="grid four">
              <Field label="Detent center" name="iDetentCenter" value={config.iDetentCenter} onChange={(key, value) => applyChanges({ [key]: value })} type="number" min="0" max="65535" />
              <Field label="Detent deadzone" name="iDetentDeadzone" value={config.iDetentDeadzone} onChange={(key, value) => applyChanges({ [key]: value })} type="number" min="0" max="12000" />
              <Field label="Idle plateau" name="fIdlePlateau" value={config.fIdlePlateau} onChange={(key, value) => applyChanges({ [key]: value })} type="number" min="0" max="0.5" step="0.01" />
              <Field label="Poll rate" name="iPollRateHz" value={config.iPollRateHz} onChange={(key, value) => applyChanges({ [key]: value })} type="number" min="30" max="500" />
            </div>
            <div className="checks">
              <Checkbox label="Unipolar throttle" name="bUnipolarMode" checked={config.bUnipolarMode} onChange={(key, value) => applyChanges({ [key]: value })} />
              <Checkbox label="Center-detent throttle reverse" name="bReverseEnabled" checked={config.bReverseEnabled} onChange={(key, value) => applyChanges({ [key]: value })} />
              <Checkbox label="Logging" name="bLogThrottle" checked={config.bLogThrottle} onChange={(key, value) => applyChanges({ [key]: value })} />
            </div>
          </section>

          <section className="panel">
            <h2>Reverse Slider</h2>
            <div className="grid four">
              <Field label="Deadzone" name="fReverseDeadzone" value={config.fReverseDeadzone} onChange={(key, value) => applyChanges({ [key]: value })} type="number" min="0" max="1" step="0.01" />
              <Field label="Activation threshold" name="fReverseActivationThreshold" value={config.fReverseActivationThreshold} onChange={(key, value) => applyChanges({ [key]: value })} type="number" min="0" max="1" step="0.01" />
            </div>
            <div className="checks">
              <Checkbox label="Enable reverse slider memory injection" name="bReverseAxisEnabled" checked={config.bReverseAxisEnabled} onChange={(key, value) => applyChanges({ [key]: value })} />
            </div>
          </section>

          <section className="panel">
            <h2>Runtime Control</h2>
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
          </section>

          <section className="panel">
            <h2>Digital Axis Substitutes</h2>
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
              <Field label="Digital roll value" name="fDigitalRollValue" value={config.fDigitalRollValue} onChange={(key, value) => applyChanges({ [key]: value })} type="number" min="0" max="1" step="0.05" />
              <Field label="Digital strafe value" name="fDigitalStrafeValue" value={config.fDigitalStrafeValue} onChange={(key, value) => applyChanges({ [key]: value })} type="number" min="0" max="1" step="0.05" />
            </div>
          </section>

          <section className="panel">
            <div className="section-header">
              <h2>Ship Buttons</h2>
              <Checkbox label="Enabled" name="bShipButtonsEnabled" checked={config.bShipButtonsEnabled} onChange={(key, value) => applyChanges({ [key]: value })} />
            </div>
            <div className="binding-list">
              {shipActions.map((action) => (
                <ShipActionRow
                  key={action.id}
                  action={action}
                  config={config}
                  device={vjoyDevice}
                  listening={listening}
                  collisions={outputCollisions}
                  onChange={applyChanges}
                  onListen={listenFor}
                  onTest={testShipOutput}
                />
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-header">
              <h2>Extra Buttons</h2>
              <button type="button" onClick={addExtraButton}>Add</button>
            </div>
            <div className="binding-list">
              {config.buttonExpansion.length === 0 ? (
                <div className="empty">No extra passthrough buttons configured.</div>
              ) : config.buttonExpansion.map((row) => (
                <ExtraButtonRow
                  key={row.id}
                  row={row}
                  device={vjoyDevice}
                  listening={listening}
                  collisions={outputCollisions}
                  onChange={updateExtraButton}
                  onRemove={removeExtraButton}
                  onListen={listenFor}
                  onTest={testExtraOutput}
                />
              ))}
            </div>
          </section>
        </div>

        {previewOpen ? (
          <aside className="panel preview-panel">
            <div className="preview-header">
              <h2>INI Preview</h2>
              <button type="button" onClick={() => { setLoadedIni(""); setConfig(defaults); setStatus("Defaults restored"); }}>Defaults</button>
            </div>
            <textarea value={preview} readOnly spellCheck="false" />
          </aside>
        ) : null}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
