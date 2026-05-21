import React from "react";
import { Field, Checkbox } from "./FormControls";

export function HosasSettings({ config, applyChanges, handleHosasModeChange }) {
  return (
    <>
      {/* Calibration Panel */}
      <section className="panel">
        <h2>Calibration</h2>
        <div className="grid four">
          <Field
            label="Detent center"
            name="iDetentCenter"
            value={config.iDetentCenter}
            onChange={(key, value) => applyChanges({ [key]: value })}
            type="number"
            min="0"
            max="65535"
          />
          <Field
            label="Detent deadzone"
            name="iDetentDeadzone"
            value={config.iDetentDeadzone}
            onChange={(key, value) => applyChanges({ [key]: value })}
            type="number"
            min="0"
            max="12000"
          />
          <Field
            label="Idle plateau"
            name="fIdlePlateau"
            value={config.fIdlePlateau}
            onChange={(key, value) => applyChanges({ [key]: value })}
            type="number"
            min="0"
            max="0.5"
            step="0.01"
          />
          <Field
            label="Poll rate"
            name="iPollRateHz"
            value={config.iPollRateHz}
            onChange={(key, value) => applyChanges({ [key]: value })}
            type="number"
            min="30"
            max="500"
          />
        </div>
        <div className="checks">
          <Checkbox
            label="Unipolar throttle"
            name="bUnipolarMode"
            checked={config.bUnipolarMode}
            onChange={(key, value) => applyChanges({ [key]: value })}
          />
          <Checkbox
            label="Center-detent throttle reverse"
            name="bReverseEnabled"
            checked={config.bReverseEnabled}
            onChange={(key, value) => applyChanges({ [key]: value })}
          />
          <Checkbox
            label="Logging"
            name="bLogThrottle"
            checked={config.bLogThrottle}
            onChange={(key, value) => applyChanges({ [key]: value })}
          />
        </div>
      </section>

      {/* HOSAS & Advanced Options Panel */}
      <section className="panel">
        <h2>HOSAS & Advanced Options (Experimental)</h2>
        <div className="grid four">
          <Field
            label="Throttle Ramp Rate"
            name="fThrottleRampRate"
            value={config.fThrottleRampRate}
            onChange={(key, value) => applyChanges({ [key]: value })}
            type="number"
            min="0.01"
            max="5.0"
            step="0.05"
          />
        </div>
        <div className="checks">
          <Checkbox
            label="Always On Mode"
            name="bAlwaysOn"
            checked={config.bAlwaysOn}
            onChange={(key, value) => applyChanges({ [key]: value })}
          />
          <Checkbox
            label="Incremental Throttle Mode (HOSAS Deflection)"
            name="bIncrementalThrottleMode"
            checked={config.bIncrementalThrottleMode}
            onChange={handleHosasModeChange}
          />
          <Checkbox
            label="Keyboard Emulation Mode (W/S Pulse)"
            name="bIncrementalKeyboardMode"
            checked={config.bIncrementalKeyboardMode}
            onChange={handleHosasModeChange}
          />
        </div>
      </section>

      {/* Reverse Slider Panel */}
      <section className="panel">
        <h2>Reverse Slider</h2>
        <div className="grid four">
          <Field
            label="Deadzone"
            name="fReverseDeadzone"
            value={config.fReverseDeadzone}
            onChange={(key, value) => applyChanges({ [key]: value })}
            type="number"
            min="0"
            max="1"
            step="0.01"
          />
          <Field
            label="Activation threshold"
            name="fReverseActivationThreshold"
            value={config.fReverseActivationThreshold}
            onChange={(key, value) => applyChanges({ [key]: value })}
            type="number"
            min="0"
            max="1"
            step="0.01"
          />
        </div>
        <div className="checks">
          <Checkbox
            label="Enable reverse slider memory injection"
            name="bReverseAxisEnabled"
            checked={config.bReverseAxisEnabled}
            onChange={(key, value) => applyChanges({ [key]: value })}
          />
        </div>
      </section>
    </>
  );
}
