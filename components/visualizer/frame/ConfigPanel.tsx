import type { FieldSection, FieldValue, InputValues } from "@/lib/visualizer/core/fields";
import { ConfigField } from "./ConfigFields";

interface ConfigPanelProps {
  sections: FieldSection[];
  values: InputValues;
  sequence: string[];
  onChange: (key: string, value: FieldValue) => void;
}

export function ConfigPanel({ sections, values, sequence, onChange }: ConfigPanelProps) {
  return (
    <div className="viz-config">
      {sections.map((s, i) => (
        <section
          key={s.title || `section-${i}`}
          className="viz-config__section"
          aria-label={s.title || undefined}
        >
          {i > 0 && <hr className="viz-config__divider" />}
          {i > 0 && s.title && <h3 className="viz-config__group">{s.title}</h3>}
          {s.fields.map((f) => (
            <ConfigField
              key={f.key}
              field={f}
              value={values[f.key] ?? null}
              sequence={sequence}
              onChange={(v) => onChange(f.key, v)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
