import { useId, useState } from "react";
import {
  type ChipsField,
  type FieldSpec,
  type FieldValue,
  parseSequence,
  type SeedField,
  type SequenceField,
  type SliderField,
} from "@/lib/visualizer/core/fields";
import { formatSeed, randomSeed } from "@/lib/visualizer/core/rng";
import { ChoiceGroup } from "../ui/ChoiceGroup";

interface FieldProps<F extends FieldSpec> {
  field: F;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
}

function ChipsInput({ field, value, onChange }: FieldProps<ChipsField>) {
  return (
    <div className="viz-field">
      {!field.hideLabel && <div className="viz-field__label">{field.label}</div>}
      <ChoiceGroup
        label={field.label}
        options={field.options}
        value={typeof value === "string" ? value : ""}
        onChange={onChange}
      />
    </div>
  );
}

function SliderInput({ field, value, onChange }: FieldProps<SliderField>) {
  const id = useId();
  const v = typeof value === "number" ? value : field.min;
  return (
    <div className="viz-field">
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
        onChange={(e) => onChange(Number(e.target.value))}
      />
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
  const [invalid, setInvalid] = useState(false);
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
          setInvalid(false);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          const keys = parseSequence(draft, field.maxLen);
          if (!keys) {
            setInvalid(true);
            return;
          }
          setInvalid(false);
          onChange(keys);
        }}
      />
      <p className={`viz-field__hint${invalid ? " is-error" : ""}`}>
        {invalid ? "Use letters A–Z" : field.hint}
      </p>
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
}

export function ConfigField({ field, value, sequence, onChange }: ConfigFieldProps) {
  switch (field.kind) {
    case "chips":
      return <ChipsInput field={field} value={value} onChange={onChange} />;
    case "slider":
      return <SliderInput field={field} value={value} onChange={onChange} />;
    case "sequence":
      return (
        <SequenceInput
          key={sequence.join("")}
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
