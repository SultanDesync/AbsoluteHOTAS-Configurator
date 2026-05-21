import React from "react";

export function Field({ label, name, value, onChange, type = "text", ...props }) {
  return (
    <label>
      {label}
      <input
        name={name}
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(name, event.target.value)}
        {...props}
      />
    </label>
  );
}

export function Checkbox({ label, name, checked, onChange }) {
  return (
    <label className="check">
      <input
        name={name}
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(name, event.target.checked)}
      />
      {label}
    </label>
  );
}
