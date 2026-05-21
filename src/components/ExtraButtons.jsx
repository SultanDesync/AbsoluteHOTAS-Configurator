import React, { useState } from "react";
import { outputCatalog, outputFromValue, outputLabel } from "../shipActions";
import {
  selectedControl,
  controlLabel,
  controlsFor,
  controlKey,
  extraButtonValueChanges,
  normalizedOutputValue
} from "./utils";

export function ExtraButtonRow({
  row,
  device,
  listening,
  collisions,
  onChange,
  onRemove,
  onListen,
  onTest
}) {
  const control = selectedControl(device, "button", row.button);
  const outputAction = { outputs: { main: null, alt: null } };
  const output = outputFromValue(outputAction, row.output);
  const selectedOutputValue = output?.value ?? row.output ?? "none";
  const matchingRows = collisions.byOutput.get(normalizedOutputValue(selectedOutputValue)) ?? [];
  const duplicateRows = matchingRows.filter((item) => item.id !== row.id);
  const vanillaRows = collisions.vanillaByOutput.get(normalizedOutputValue(selectedOutputValue)) ?? [];
  const hasCatalogValue =
    selectedOutputValue === "none" ||
    outputCatalog.some(
      (item) => item.value.toLowerCase() === String(selectedOutputValue).toLowerCase()
    );

  return (
    <div className="binding-row extra-row">
      <div>
        <strong>Extra Button</strong>
        <span>
          {control ? controlLabel(control) : row.button ? `Button ${row.button}` : "Unbound"} /
          plugin output: {outputLabel(output)}
        </span>
        {duplicateRows.length ? (
          <span className="warning">
            Also emitted by {duplicateRows.map((item) => item.label).join(", ")}
          </span>
        ) : null}
        {vanillaRows.length ? (
          <span className="warning">
            Vanilla output for {vanillaRows.map((item) => item.label).join(", ")}
          </span>
        ) : null}
      </div>
      <select
        value={control ? control.id : ""}
        onChange={(event) =>
          onChange(
            extraButtonValueChanges(
              row,
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
      <select
        value={selectedOutputValue}
        onChange={(event) => onChange({ ...row, output: event.target.value })}
      >
        <option value="none">No output</option>
        {!hasCatalogValue ? <option value={selectedOutputValue}>Current: {selectedOutputValue}</option> : null}
        {outputCatalog.map((item) => (
          <option key={`${row.id}:${item.value}`} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onListen("button", row)}
        disabled={!device || Boolean(listening)}
      >
        {listening === `button:${row.id}` ? "Binding" : "Bind"}
      </button>
      <button type="button" onClick={() => onTest(row, output)} disabled={!output}>
        Test
      </button>
      <button type="button" onClick={() => onRemove(row.id)}>
        Remove
      </button>
    </div>
  );
}

export function ExtraButtons({
  config,
  vjoyDevice,
  listening,
  outputCollisions,
  updateExtraButton,
  addExtraButton,
  removeExtraButton,
  listenFor,
  testExtraOutput
}) {
  const [extraButtonsOpen, setExtraButtonsOpen] = useState(false);

  return (
    <section className="panel">
      <div className="section-header">
        <h2>Extra Buttons</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" onClick={() => setExtraButtonsOpen(!extraButtonsOpen)}>
            {extraButtonsOpen ? "Collapse" : "Expand"}
          </button>
          {extraButtonsOpen && (
            <button type="button" onClick={addExtraButton}>
              Add
            </button>
          )}
        </div>
      </div>
      {extraButtonsOpen && (
        <div className="binding-list">
          {(config.buttonExpansion ?? []).length === 0 ? (
            <div className="empty">No extra passthrough buttons configured.</div>
          ) : (
            config.buttonExpansion.map((row) => (
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
            ))
          )}
        </div>
      )}
    </section>
  );
}
