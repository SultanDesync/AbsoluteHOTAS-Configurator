import React, { useState } from "react";
import { outputCatalog, outputFromValue, outputLabel, shipActions } from "../shipActions";
import { Checkbox } from "./FormControls";
import {
  selectedControl,
  controlLabel,
  controlsFor,
  controlKey,
  buttonValueChanges,
  defaultOutputValue,
  normalizedOutputValue
} from "./utils";

export function ShipActionRow({
  action,
  config,
  device,
  listening,
  collisions,
  onChange,
  onListen,
  onTest,
  secondaryBindings,
  onChangeSecondary,
  recordingActionId,
  onRecordSecondary
}) {
  const control = selectedControl(device, "button", config[action.iniKey]);
  const output = outputFromValue(action, config[action.outputIniKey]);
  const selectedOutputValue = output?.value ?? config[action.outputIniKey] ?? "none";
  const defaultValue = defaultOutputValue(action);
  const hasVanillaOutput = normalizedOutputValue(defaultValue) !== "none";
  const usesVanillaOutput =
    hasVanillaOutput && normalizedOutputValue(selectedOutputValue) === normalizedOutputValue(defaultValue);
  const matchingRows = collisions.byOutput.get(normalizedOutputValue(selectedOutputValue)) ?? [];
  const duplicateRows = matchingRows.filter((row) => row.id !== action.id);
  const vanillaRows = (collisions.vanillaByOutput.get(normalizedOutputValue(selectedOutputValue)) ?? []).filter(
    (row) => row.id !== action.id
  );
  const customOutputOptions = outputCatalog.filter(
    (item) => item.value.toLowerCase() !== String(defaultValue).toLowerCase()
  );
  const hasCatalogValue =
    selectedOutputValue === "none" ||
    usesVanillaOutput ||
    customOutputOptions.some((item) => item.value.toLowerCase() === String(selectedOutputValue).toLowerCase());

  const isJoystickBound = control !== null;
  const emulatedKeyLabel = outputLabel(output);

  return (
    <div className="binding-row ship-row">
      <div className="action-info">
        <strong>{action.label}</strong>
        {action.id === "GetUp" && (
          <div style={{ fontSize: "11px", color: "#8ab4be", marginTop: "4px", fontStyle: "italic", opacity: 0.8, lineHeight: "1.3" }}>
            ℹ️ Starfield hardcodes flight seat-exit to holding "Select Target". This dedicated "Get Up" key operates only while docked/grounded.
          </div>
        )}
        <div className={isJoystickBound ? "pipeline-badge active" : "pipeline-badge inactive"}>
          {isJoystickBound ? (
            <>
              <span className="icon">🎮</span>
              <span className="badge-text">Button {controlLabel(control)}</span>
              <span className="arrow">➡️</span>
              <span className="icon">⌨️</span>
              <span className="badge-text">Emits {emulatedKeyLabel}</span>
            </>
          ) : (
            <>
              <span className="icon">🎮</span>
              <span className="badge-text">Joystick Unbound</span>
            </>
          )}
        </div>
        {duplicateRows.length ? (
          <span className="warning">
            Also emitted by {duplicateRows.map((row) => row.label).join(", ")}
          </span>
        ) : null}
        {!usesVanillaOutput && vanillaRows.length ? (
          <span className="warning">
            Vanilla output for {vanillaRows.map((row) => row.label).join(", ")}
          </span>
        ) : null}
      </div>
      <select
        value={control ? control.id : ""}
        onChange={(event) =>
          onChange(
            buttonValueChanges(
              action,
              controlsFor(device, "button").find((item) => item.id === event.target.value)
            )
          )
        }
      >
        <option value="">Unbound</option>
        {controlsFor(device, "button").map((item) => (
          <option key={controlKey(item)} value={item.id}>
            {controlLabel(item)}
          </option>
        ))}
      </select>
      <div className="output-cell">
        <span className="output-note text-bypass">Output key</span>
        <div style={{ display: "flex", gap: "4px" }}>
          <select
            value={secondaryBindings[action.id] || defaultValue}
            onChange={(event) => onChangeSecondary(action.id, event.target.value)}
            disabled={recordingActionId === action.id}
          >
            {hasVanillaOutput ? <option value={defaultValue}>Default</option> : null}
            <option value="none">No output</option>
            {!hasCatalogValue ? <option value={selectedOutputValue}>Current: {selectedOutputValue}</option> : null}
            {customOutputOptions.map((item) => (
              <option key={`output:${action.id}:${item.value}`} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onRecordSecondary(action.id)}
            style={{
              padding: "4px 8px",
              minHeight: "40px",
              flex: "0 0 auto",
              border: recordingActionId === action.id ? "2px solid #ff4a4a" : "2px solid #00758e",
              background: recordingActionId === action.id ? "#2c0000" : "#08242d"
            }}
          >
            {recordingActionId === action.id ? "🔴 Rec" : "Rec"}
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onListen("button", action)}
        disabled={!device || Boolean(listening)}
      >
        {listening === `button:${action.id}` ? "Binding" : "Bind"}
      </button>
      <button type="button" onClick={() => onTest(action, output)} disabled={!output}>
        Test
      </button>
    </div>
  );
}

export function ShipActionsTable({
  config,
  vjoyDevice,
  listening,
  outputCollisions,
  applyChanges,
  listenFor,
  testShipOutput,
  secondaryBindings,
  handleChangeSecondary,
  recordingActionId,
  handleRecordSecondary,
  onAutoMapUnused
}) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [shipButtonsOpen, setShipButtonsOpen] = useState(true);

  return (
    <section className="panel">
      <div className="section-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h2>Ship Buttons</h2>
          <button
            type="button"
            className="guide-toggle-btn"
            onClick={() => setGuideOpen(!guideOpen)}
            style={{
              padding: "4px 10px",
              fontSize: "12px",
              minHeight: "28px",
              background: guideOpen ? "#006b83" : "#071c22",
              border: "1px solid #00758e",
              borderRadius: "15px"
            }}
          >
            {guideOpen ? "📖 Hide Guide" : "📘 Show Binding Pipeline Guide"}
          </button>
          <button
            type="button"
            className="auto-map-btn"
            onClick={onAutoMapUnused}
            style={{
              padding: "4px 12px",
              fontSize: "12px",
              minHeight: "28px",
              background: "#083a3f",
              color: "#00e5ff",
              border: "1px solid #00bcff",
              borderRadius: "15px",
              cursor: "pointer",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#0a4e55";
              e.currentTarget.style.boxShadow = "0 0 8px rgba(0, 188, 255, 0.4)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#083a3f";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            ⚡ Auto-Map Unused Keys
          </button>
          <button type="button" onClick={() => setShipButtonsOpen(!shipButtonsOpen)}>
            {shipButtonsOpen ? "Collapse" : "Expand"}
          </button>
        </div>
        <Checkbox
          label="Enabled"
          name="bShipButtonsEnabled"
          checked={config.bShipButtonsEnabled}
          onChange={(key, value) => applyChanges({ [key]: value })}
        />
      </div>

      {shipButtonsOpen && (
        <>
          {guideOpen && (
            <div className="pipeline-guide-card">
              <h3>🎮 Understanding the Input & Output Priority Pipeline</h3>
              <p>
                The AbsoluteHOTAS system links your physical inputs to Starfield's engine through a <strong>Priority Pipeline</strong>:
              </p>
              <div className="pipeline-flow-diagram">
                <div className="flow-step">
                  <span className="step-badge icon-vjoy">1. Joystick Input</span>
                  <p>Physical button on your HOTAS/Throttle. Pressing this triggers the mapping.</p>
                </div>
                <div className="flow-arrow">➡️</div>
                <div className="flow-step">
                  <span className="step-badge icon-emulated">2. Joystick Output Key</span>
                  <p>The standard keyboard/mouse key emulated by the plugin (e.g., E for Get Up). Preserved automatically.</p>
                </div>
                <div className="flow-arrow">➡️</div>
                <div className="flow-step">
                  <span className="step-badge icon-game">3. Starfield Action</span>
                  <p>The action is triggered seamlessly in-game. Standard layouts work out-of-the-box.</p>
                </div>
              </div>
              <div className="pipeline-note-box">
                <p>
                  <strong>Default output</strong> emits the vanilla Starfield key for that action. Recording a key replaces that output in the INI, so the HOTAS button sends the recorded key instead.
                </p>
              </div>

              <div className="pipeline-note-box" style={{ marginTop: "16px", borderLeft: "4px solid #00bcff", background: "#051f26" }}>
                <h4 style={{ margin: "0 0 6px 0", color: "#00e5ff", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>⚡</span> Auto-Mapping Unused Keyboard Keys
                </h4>
                <p style={{ margin: 0, fontSize: "12px", lineHeight: "1.5", color: "#b0d0d6" }}>
                  Many default Starfield keyboard keys (like <strong>E</strong>) are shared across flight targeting and walking around or dialog. Pressing your joystick button can trigger both actions!
                </p>
                <p style={{ margin: "6px 0 0 0", fontSize: "12px", lineHeight: "1.5", color: "#b0d0d6" }}>
                  Clicking <strong>⚡ Auto-Map Unused Keys</strong> assigns unique, completely unused keyboard keys (such as <code>Numpad 7</code>, <code>[</code>, <code>;</code>, etc.) to all Starship controls. Once saved, this decouples ship controls from on-foot controls completely, ensuring single-function inputs for your joystick!
                </p>
              </div>
            </div>
          )}

          {/* Structured Table Headers */}
          <div className="ship-row table-header">
            <div className="header-cell">Action Name & Pipeline Status</div>
            <div className="header-cell">1. Joystick Input (vJoy)</div>
            <div className="header-cell">2. Output Key</div>
            <div className="header-cell">Bind Input</div>
            <div className="header-cell">Test Key</div>
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
                secondaryBindings={secondaryBindings}
                onChangeSecondary={handleChangeSecondary}
                recordingActionId={recordingActionId}
                onRecordSecondary={handleRecordSecondary}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
