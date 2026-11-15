import type {
  FieldAvailability,
  FieldSection,
  FieldValue,
  InputValues,
} from "@/lib/visualizer/core/fields";
import { ConfigField } from "./ConfigFields";

interface ConfigPanelProps {
  sections: FieldSection[];
  values: InputValues;
  sequence: string[];
  sequences?: Record<string, string[]>;
  onChange: (key: string, value: FieldValue) => void;
  onAction?: (key: string) => void;
  variantNav?: { key: string; onStep: (delta: number) => void };
  availability?: Record<string, FieldAvailability>;
}

export function ConfigPanel({
  sections,
  values,
  sequence,
  sequences,
  onChange,
  onAction,
  variantNav,
  availability,
}: ConfigPanelProps) {
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
              values={values}
              sequence={sequences?.[f.key] ?? sequence}
              onChange={(v) => onChange(f.key, v)}
              onAction={() => onAction?.(f.key)}
              nav={variantNav && variantNav.key === f.key ? variantNav : undefined}
              availability={availability?.[f.key]}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
