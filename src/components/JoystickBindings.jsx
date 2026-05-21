import React from "react";
import { Field, Checkbox } from "./FormControls";
import {
  deviceIndex,
  controlsFor,
  controlLabel,
  controlKey,
  selectedControl,
  axisBindingLabel,
  axisValueChanges,
  buttonValueChanges
} from "./utils";

export function DeviceSummary({ device, inventory, onRefresh }) {
  const axes = controlsFor(device, "axis").length;
  const buttons = controlsFor(device, "button").length;
  const allDevices = inventory.length;

  return (
    <section className="panel device-panel">
      <div className="section-header">
        <h2>vJoy Device</h2>
        <button type="button" onClick={onRefresh}>
          Refresh
        </button>
      </div>
      {device ? (
        <div className="device-line">
          <strong>
            {deviceIndex(device)}: {device.name}
          </strong>
          <span>
            {axes} axes / {buttons} buttons
          </span>
        </div>
      ) : (
        <div className="empty">
          No vJoy DirectInput device found. DirectInput devices seen: {allDevices}
        </div>
      )}
    </section>
  );
}

export function AxisRow({ row, config, device, listening, onChange, onListen }) {
  const control = selectedControl(device, "axis", config[row.axis]);

  return (
    <div className="binding-row axis-row">
      <div>
        <strong>{row.title}</strong>
        <span>{axisBindingLabel(device, config[row.axis])}</span>
      </div>
      <select
        value={control ? control.id : ""}
        onChange={(event) =>
          onChange(
            axisValueChanges(
              row,
              controlsFor(device, "axis").find((item) => item.id === event.target.value)
            )
          )
        }
      >
        <option value="" disabled>
          {device ? "Choose vJoy axis" : "No vJoy device"}
        </option>
        {controlsFor(device, "axis").map((item) => (
          <option key={controlKey(item)} value={item.id}>
            {controlLabel(item)}
          </option>
        ))}
      </select>
      {row.sens ? (
        <Field
          label="Sensitivity"
          name={row.sens}
          value={config[row.sens]}
          onChange={(key, value) => onChange({ [key]: value })}
          type="number"
          min="0"
          max="5"
          step="0.05"
        />
      ) : (
        <div />
      )}
      {row.invert ? (
        <Checkbox
          label="Invert"
          name={row.invert}
          checked={config[row.invert]}
          onChange={(key, value) => onChange({ [key]: value })}
        />
      ) : (
        <div />
      )}
      <button
        type="button"
        onClick={() => onListen("axis", row)}
        disabled={!device || Boolean(listening)}
      >
        {listening === `axis:${row.axis}` ? "Binding" : "Bind"}
      </button>
    </div>
  );
}

export function RuntimeButtonRow({ action, config, device, listening, onChange, onListen }) {
  const control = selectedControl(device, "button", config[action.iniKey]);

  return (
    <div className="binding-row runtime-row">
      <div>
        <strong>{action.label}</strong>
        <span>{controlLabel(control)}</span>
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
      <button
        type="button"
        onClick={() => onListen("button", action)}
        disabled={!device || Boolean(listening)}
      >
        {listening === `button:${action.id}` ? "Binding" : "Bind"}
      </button>
    </div>
  );
}

export function DigitalAxisButtonRow({ action, config, device, listening, onChange, onListen }) {
  const control = selectedControl(device, "button", config[action.iniKey]);

  return (
    <div className="binding-row runtime-row">
      <div>
        <strong>{action.label}</strong>
        <span>
          {control
            ? controlLabel(control)
            : config[action.iniKey] === "-1"
            ? "Unbound"
            : `Current INI value: ${config[action.iniKey]}`}
        </span>
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
      <button
        type="button"
        onClick={() => onListen("button", action)}
        disabled={!device || Boolean(listening)}
      >
        {listening === `button:${action.id}` ? "Binding" : "Bind"}
      </button>
    </div>
  );
}
