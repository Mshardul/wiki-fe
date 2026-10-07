"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Modal } from "@/components/common/Modal";
import { clearData, DATA_CATEGORIES } from "@/lib/storage/data-clear";
import { loadDataJson } from "@/lib/storage/data-json";
import {
  getSettingsSnapshot,
  type Settings,
  subscribeSettings,
  updateSettings,
} from "@/lib/storage/settings";
import {
  DARK_ACCENTS,
  DARK_BACKGROUNDS,
  DARK_TEXT_COLORS,
  FONT_OPTIONS,
  LIGHT_ACCENTS,
  LIGHT_BACKGROUNDS,
  LIGHT_TEXT_COLORS,
} from "@/lib/storage/settings-presets";
import { showToast } from "@/lib/toast";

type Tab = "general" | "keyboard" | "actions" | "advanced";
type Shortcuts = Awaited<ReturnType<typeof loadDataJson<"shortcuts">>>;

const TAB_LABELS: Record<Tab, string> = {
  general: "Appearance",
  keyboard: "Shortcuts",
  actions: "Actions",
  advanced: "Advanced",
};

const isDarkBg = (id: string) => !id.startsWith("light-");

function SwatchRow<T extends { id: string; label: string }>({
  label,
  options,
  current,
  onPick,
}: {
  label: string;
  options: T[];
  current: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="prefs-section">
      <div className="prefs-section-label">{label}</div>
      <div className="settings-size-row">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`settings-size-btn${o.id === current ? " active" : ""}`}
            aria-pressed={o.id === current}
            onClick={() => onPick(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label,
  on,
  onLabel = "On",
  offLabel = "Off",
  onToggle,
}: {
  label: string;
  on: boolean;
  onLabel?: string;
  offLabel?: string;
  onToggle: () => void;
}) {
  return (
    <div className="prefs-section">
      <div className="prefs-section-label">{label}</div>
      <div className="settings-size-row">
        <button
          type="button"
          className={`settings-size-btn${on ? " active" : ""}`}
          aria-pressed={on}
          onClick={onToggle}
        >
          {on ? onLabel : offLabel}
        </button>
      </div>
    </div>
  );
}

export function PreferencesModal() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("general");
  const [shortcuts, setShortcuts] = useState<Shortcuts | null>(null);
  const s = useSyncExternalStore<Settings>(
    subscribeSettings,
    getSettingsSnapshot,
    getSettingsSnapshot,
  );

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: Tab }>).detail;
      setTab(detail?.tab ?? "general");
      setOpen(true);
    };
    document.addEventListener("wiki:open-settings", onOpen);
    return () => document.removeEventListener("wiki:open-settings", onOpen);
  }, []);

  useEffect(() => {
    if (tab === "keyboard" && !shortcuts) void loadDataJson("shortcuts").then(setShortcuts);
  }, [tab, shortcuts]);

  const dark = isDarkBg(s.backgroundId);
  const set = (patch: Partial<Settings>) => updateSettings(patch);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      label="Preferences"
      className="prefs-dialog"
      backdropClassName="prefs-modal"
    >
      <div className="prefs-tabs" role="tablist">
        {(["general", "keyboard", "actions", "advanced"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`prefs-tab${tab === t ? " active" : ""}`}
            data-action="prefs-tab"
            data-tab={t}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <div className="prefs-panel active">
          <SwatchRow
            label="Background"
            options={dark ? DARK_BACKGROUNDS : LIGHT_BACKGROUNDS}
            current={s.backgroundId}
            onPick={(id) => set({ backgroundId: id })}
          />
          <div className="prefs-section">
            <div className="prefs-section-label">Theme</div>
            <div className="settings-size-row">
              <button
                type="button"
                className={`settings-size-btn${!dark ? " active" : ""}`}
                aria-pressed={!dark}
                onClick={() =>
                  set({
                    backgroundId: "light-white",
                    textColorId: "text-crisp-light",
                    accentId: "indigo-l",
                  })
                }
              >
                Light
              </button>
              <button
                type="button"
                className={`settings-size-btn${dark ? " active" : ""}`}
                aria-pressed={dark}
                onClick={() =>
                  set({
                    backgroundId: "dark-void",
                    textColorId: "text-crisp-dark",
                    accentId: "indigo",
                  })
                }
              >
                Dark
              </button>
            </div>
          </div>
          <SwatchRow
            label="Text colour"
            options={dark ? DARK_TEXT_COLORS : LIGHT_TEXT_COLORS}
            current={s.textColorId}
            onPick={(id) => set({ textColorId: id })}
          />
          <SwatchRow
            label="Accent"
            options={dark ? DARK_ACCENTS : LIGHT_ACCENTS}
            current={s.accentId}
            onPick={(id) => set({ accentId: id })}
          />
          <SwatchRow
            label="Font"
            options={FONT_OPTIONS}
            current={s.font}
            onPick={(id) => set({ font: id })}
          />
          <SwatchRow
            label="Font size"
            options={[
              { id: "S", label: "Small" },
              { id: "M", label: "Medium" },
              { id: "L", label: "Large" },
            ]}
            current={s.fontSize}
            onPick={(id) => set({ fontSize: id as Settings["fontSize"] })}
          />
          <SwatchRow
            label="Content width"
            options={[
              { id: "Narrow", label: "Narrow" },
              { id: "Default", label: "Default" },
              { id: "Wide", label: "Wide" },
            ]}
            current={s.contentWidth}
            onPick={(id) => set({ contentWidth: id as Settings["contentWidth"] })}
          />
          <SwatchRow
            label="Line height"
            options={[
              { id: "Tight", label: "Tight" },
              { id: "Normal", label: "Normal" },
              { id: "Relaxed", label: "Relaxed" },
            ]}
            current={s.lineHeight}
            onPick={(id) => set({ lineHeight: id as Settings["lineHeight"] })}
          />
        </div>
      )}

      {tab === "keyboard" && (
        <div className="prefs-panel active prefs-shortcuts-body">
          {shortcuts == null ? (
            <p>Loading…</p>
          ) : (
            Object.entries(shortcuts).map(([group, items]) => (
              <div className="help-group" key={group}>
                <div className="help-group-label">{group}</div>
                {items.map((sc, i) => (
                  <div className="help-row" key={`${group}-${i}`}>
                    <span className="help-keys">{sc.keys.join(" ")}</span>
                    <span className="help-desc">{sc.description}</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "actions" && (
        <div className="prefs-panel active" id="prefs-panel-actions">
          <div className="prefs-actions-list">
            <button
              type="button"
              className="prefs-action-row"
              data-action="complexity-compare-open"
              title="Compare complexity"
              aria-label="Compare complexity"
              onClick={() => {
                setOpen(false);
                document.dispatchEvent(new CustomEvent("wiki:open-complexity-compare"));
              }}
            >
              <svg className="icon" aria-hidden="true">
                <use href="#icon-arrows-diff" />
              </svg>
              <span className="prefs-action-label">Compare complexity</span>
            </button>
          </div>
        </div>
      )}

      {tab === "advanced" && (
        <div className="prefs-panel active">
          <Toggle
            label="Practice problem answers"
            on={s.practiceAnswersHidden}
            onLabel="Hidden"
            offLabel="Shown"
            onToggle={() => set({ practiceAnswersHidden: !s.practiceAnswersHidden })}
          />
          <div className="prefs-section">
            <div className="prefs-section-label">Clear my data</div>
            <div className="settings-size-row">
              <button
                type="button"
                className="settings-size-btn"
                onClick={() => {
                  if (!confirm("Clear all local data? This cannot be undone.")) return;
                  clearData(DATA_CATEGORIES.map((c) => c.key));
                  showToast("Local data cleared", { variant: "success" });
                }}
              >
                Clear everything
              </button>
            </div>
          </div>
          {document.getElementById("markdown-body") && (
            <div className="prefs-section">
              <div className="prefs-section-label">Article</div>
              <div className="settings-size-row">
                <button
                  type="button"
                  className="settings-size-btn"
                  onClick={() => {
                    setOpen(false);
                    document.dispatchEvent(new CustomEvent("wiki:print-article"));
                  }}
                >
                  Print / save as PDF
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
