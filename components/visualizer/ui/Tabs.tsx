interface TabsProps<T extends string> {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  idPrefix: string;
}

export function Tabs<T extends string>({ tabs, active, onChange, idPrefix }: TabsProps<T>) {
  return (
    <div className="viz-tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${t.id}`}
          aria-selected={t.id === active}
          aria-controls={`${idPrefix}-panel`}
          className={`viz-tabs__tab${t.id === active ? " is-on" : ""}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
