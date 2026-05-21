import { normalizeAxisControlId } from "../ini";
import { outputFromValue, outputLabel, outputOptionsForAction, shipActions } from "../shipActions";

export function defaultOutputValue(action) {
  return action.outputs.main?.value ?? "none";
}

export function deviceIndex(device) {
  return device.enumeration_index ?? device.enumerationIndex ?? 0;
}

export function isVJoyDevice(device) {
  const text = `${device.name ?? ""} ${device.instance_name ?? ""} ${device.product_name ?? ""}`.toLowerCase();
  return text.includes("vjoy");
}

export function controlsFor(device, kind) {
  return (device?.controls ?? []).filter((control) => control.kind === kind);
}

export function controlLabel(control) {
  if (!control) return "Unbound";
  const objectName = control.name && control.name !== control.label ? ` - ${control.name}` : "";
  return `${control.label}${objectName}`;
}

export function axisBindingLabel(device, value) {
  const control = selectedControl(device, "axis", value);
  return control ? controlLabel(control) : `Current INI value: ${value}`;
}

export function controlKey(control) {
  return `${control.kind}:${control.id}:${control.offset ?? ""}:${control.instance ?? ""}`;
}

export function selectedControl(device, kind, value) {
  return controlsFor(device, "axis").concat(controlsFor(device, "button")).find((control) => 
    control.kind === kind && String(control.id).toLowerCase() === String(value).toLowerCase()
  ) ?? null;
}

export function axisValueChanges(row, control) {
  return control ? { [row.axis]: normalizeAxisControlId(control.id) } : {};
}

export function buttonValueChanges(action, control) {
  return { [action.iniKey]: control ? String(control.id) : "-1" };
}

export function normalizedOutputValue(value) {
  return String(value ?? "none").trim().toLowerCase();
}

export function outputInstruction(action, selectedOutputValue) {
  const output = outputFromValue(action, selectedOutputValue);
  const selected = outputLabel(output);
  const vanilla = outputLabel(action.outputs.main);
  const defaultValue = defaultOutputValue(action);
  const isVanilla = normalizedOutputValue(selectedOutputValue) === normalizedOutputValue(defaultValue);

  if (!action.outputs.main) {
    return selectedOutputValue && normalizedOutputValue(selectedOutputValue) !== "none"
      ? `Joystick emits ${selected}. Bind Starfield ${action.label} to ${selected}.`
      : "No vanilla binding; select an output key and bind Starfield to match.";
  }

  if (isVanilla) {
    return `Joystick emits default ${vanilla} (matches Starfield standard key).`;
  }

  if (normalizedOutputValue(selectedOutputValue) === "none") {
    return `Joystick output disabled; Starfield ${action.label} will not receive joystick signals.`;
  }

  return `Joystick emits ${selected}. Starfield primary binding synced to ${selected}.`;
}

export function collectOutputCollisions(config) {
  const shipRows = shipActions.map((action) => ({
    id: action.id,
    label: action.label,
    value: normalizedOutputValue(config[action.outputIniKey]),
    defaultValue: normalizedOutputValue(defaultOutputValue(action)),
    section: "ship"
  }));
  const extraRows = (config.buttonExpansion ?? []).map((row) => ({
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

export function extraButtonValueChanges(row, control) {
  return {
    ...row,
    button: control ? String(control.id) : ""
  };
}

export function axisControlFromUsage(device, usageId) {
  return controlsFor(device, "axis").find((control) => String(control.id).toLowerCase() === String(usageId).toLowerCase()) ?? {
    kind: "axis",
    id: normalizeAxisControlId(usageId),
    label: normalizeAxisControlId(usageId)
  };
}

export function buttonControlFromId(device, buttonId) {
  return controlsFor(device, "button").find((control) => String(control.id) === String(buttonId)) ?? {
    kind: "button",
    id: String(buttonId),
    label: `Button ${buttonId}`
  };
}

export function deduplicateBindings(bindings) {
  const contextSeenTokens = {};
  return bindings.map((binding) => {
    const ctx = binding.context;
    if (!contextSeenTokens[ctx]) {
      contextSeenTokens[ctx] = new Set();
    }
    
    let token = binding.token;
    // We only deduplicate secondary custom bindings to avoid conflict.
    // Primary bindings represent vanilla keys, which we shouldn't dynamically nullify.
    if (binding.is_secondary && token !== 0x02FF) {
      const key = `dev:${binding.device}:tok:${token}`;
      if (contextSeenTokens[ctx].has(key)) {
        token = 0x02FF;
      } else {
        contextSeenTokens[ctx].add(key);
      }
    }
    
    return {
      ...binding,
      token: token
    };
  });
}
