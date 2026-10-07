interface ChoiceOption<T extends string | number> {
  value: T;
  label: string;
}

interface ChoiceGroupProps<T extends string | number> {
  label: string;
  options: ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: "chips" | "segmented";
}

export function ChoiceGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  variant = "chips",
}: ChoiceGroupProps<T>) {
  return (
    <div className={`viz-choice viz-choice--${variant}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={`viz-choice__btn${o.value === value ? " is-on" : ""}`}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
