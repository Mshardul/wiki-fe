import { useId, useState } from "react";
import {
  type ChipsField,
  type FieldAvailability,
  type FieldSpec,
  type FieldValue,
  parseSequenceField,
  type SeedField,
  type SequenceField,
  type SliderField,
} from "@/lib/visualizer/core/fields";
import { formatSeed, randomSeed } from "@/lib/visualizer/core/rng";
import { ChoiceGroup } from "../ui/ChoiceGroup";
import { IconButton } from "../ui/IconButton";

interface FieldProps<F extends FieldSpec> {
  field: F;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
}

function ChipsInput({
  field,
  value,
  onChange,
  nav,
  availability,
}: FieldProps<ChipsField> & {
  nav?: { onStep: (delta: number) => void };
  availability?: FieldAvailability;
}) {
  const noun = field.label.toLowerCase();
  return (
    <div className="viz-field">
      {!field.hideLabel && <div className="viz-field__label">{field.label}</div>}
      <div className="viz-field__chips-row">
        <ChoiceGroup
          label={field.label}
          options={field.options}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
        />
        {nav && (
          <span className="viz-variant-nav">
            <IconButton label={`Previous ${noun}`} onClick={() => nav.onStep(-1)}>
              ‹
            </IconButton>
            <IconButton label={`Next ${noun}`} onClick={() => nav.onStep(1)}>
              ›
            </IconButton>
          </span>
        )}
      </div>
      {availability?.hint && <p className="viz-field__hint">{availability.hint}</p>}
    </div>
  );
}

function SliderInput({
  field,
  value,
  onChange,
  availability,
}: FieldProps<SliderField> & { availability?: FieldAvailability }) {
  const id = useId();
  const v = typeof value === "number" ? value : field.min;
  const disabled = availability?.disabled === true;
  return (
    <div className={`viz-field${disabled ? " is-disabled" : ""}`}>
      <div className="viz-field__row">
        <label className="viz-field__label" htmlFor={id}>
          {field.label}
        </label>
        <b className="viz-field__value">{v}</b>
      </div>
      <input
        id={id}
        className="viz-field__range"
        type="range"
        min={field.min}
        max={field.max}
        value={v}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {availability?.hint && <p className="viz-field__hint">{availability.hint}</p>}
    </div>
  );
}

// Remounted (keyed by the run) whenever a new sequence arrives, so the draft starts fresh.
function SequenceInput({
  field,
  sequence,
  onChange,
}: FieldProps<SequenceField> & { sequence: string[] }) {
  const id = useId();
  const [draft, setDraft] = useState(() => sequence.join(" "));
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="viz-field">
      <label className="viz-field__label" htmlFor={id}>
        {field.label}
      </label>
      <input
        id={id}
        className="viz-field__seq"
        value={draft}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          const parsed = parseSequenceField(field, draft);
          if (!parsed.ok) {
            setError(parsed.error);
            return;
          }
          setError(null);
          onChange(parsed.tokens);
        }}
      />
      <p className={`viz-field__hint${error ? " is-error" : ""}`}>{error ?? field.hint}</p>
    </div>
  );
}

function SeedInput({ field, value, onChange }: FieldProps<SeedField>) {
  return (
    <div className="viz-field">
      <div className="viz-field__label">{field.label}</div>
      <div className="viz-field__seed">
        <span className="viz-field__seed-value">
          {formatSeed(typeof value === "number" ? value : 0)}
        </span>
        <button type="button" className="viz-btn" onClick={() => onChange(randomSeed())}>
          <span aria-hidden="true">↻ </span>New random run
        </button>
      </div>
    </div>
  );
}

interface ConfigFieldProps {
  field: FieldSpec;
  value: FieldValue;
  sequence: string[];
  onChange: (value: FieldValue) => void;
  nav?: { onStep: (delta: number) => void };
  availability?: FieldAvailability;
}

export function ConfigField({
  field,
  value,
  sequence,
  onChange,
  nav,
  availability,
}: ConfigFieldProps) {
  switch (field.kind) {
    case "chips":
      return (
        <ChipsInput
          field={field}
          value={value}
          onChange={onChange}
          nav={nav}
          availability={availability}
        />
      );
    case "slider":
      return (
        <SliderInput field={field} value={value} onChange={onChange} availability={availability} />
      );
    case "sequence":
      return (
        <SequenceInput
          key={sequence.join(" ")}
          field={field}
          value={value}
          sequence={sequence}
          onChange={onChange}
        />
      );
    case "seed":
      return <SeedInput field={field} value={value} onChange={onChange} />;
  }
}
