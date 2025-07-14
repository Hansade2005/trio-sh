import React from "react";

export function MCPEnvEditor({
  env,
  onChange,
}: {
  env: Record<string, string>;
  onChange: (env: Record<string, string>) => void;
}) {
  const [newKey, setNewKey] = React.useState("");
  const [newValue, setNewValue] = React.useState("");
  return (
    <div>
      {Object.entries(env).map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          <input value={k} readOnly style={{ width: 120 }} />
          <input
            value={v}
            onChange={(e) => onChange({ ...env, [k]: e.target.value })}
            style={{ width: 180 }}
          />
          <button
            onClick={() => {
              const e = { ...env };
              delete e[k];
              onChange(e);
            }}
          >
            Delete
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          placeholder="KEY"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          style={{ width: 120 }}
        />
        <input
          placeholder="VALUE"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          style={{ width: 180 }}
        />
        <button
          onClick={() => {
            if (newKey) {
              onChange({ ...env, [newKey]: newValue });
              setNewKey("");
              setNewValue("");
            }
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
