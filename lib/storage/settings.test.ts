import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applySettings,
  DEFAULT_SETTINGS,
  getSettings,
  getSettingsSnapshot,
  isDark,
  updateSettings,
} from "./settings";

describe("settings", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.cssText = "";
  });

  it("applySettings writes data-theme + the derived CSS vars for a dark preset", () => {
    applySettings(DEFAULT_SETTINGS);
    const root = document.documentElement;
    expect(root.getAttribute("data-theme")).toBe("dark");
    expect(root.style.getPropertyValue("--bg")).toBe("#0d1117");
    expect(root.style.getPropertyValue("--accent")).toBe("#6366f1");
    expect(root.style.fontSize).toBe("100%");
  });

  it("a light background flips data-theme and picks the light palette", () => {
    applySettings({ ...DEFAULT_SETTINGS, backgroundId: "light-white" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.style.getPropertyValue("--bg")).toBe("#f8fafc");
  });

  it("isDark keys off the background id prefix", () => {
    expect(isDark("dark-void")).toBe(true);
    expect(isDark("light-white")).toBe(false);
  });

  it("updateSettings persists, merges, and re-applies", () => {
    updateSettings({ fontSize: "L" });
    expect(getSettings().fontSize).toBe("L");
    expect(document.documentElement.style.fontSize).toBe("112.5%");
  });

  it("getSettings merges a stored partial over the defaults", () => {
    localStorage.setItem("wiki-settings", JSON.stringify({ backgroundId: "dark-slate" }));
    const s = getSettings();
    expect(s.backgroundId).toBe("dark-slate");
    expect(s.accentId).toBe(DEFAULT_SETTINGS.accentId);
  });

  it("dispatches wiki:theme-changed", () => {
    let fired = false;
    document.addEventListener("wiki:theme-changed", () => {
      fired = true;
    });
    applySettings(DEFAULT_SETTINGS);
    expect(fired).toBe(true);
  });

  it("applySettings writes contentWidth to --layout-padding, the var the CSS actually reads", () => {
    applySettings({ ...DEFAULT_SETTINGS, contentWidth: "Wide" });
    expect(document.documentElement.style.getPropertyValue("--layout-padding")).toBe("5%");
  });

  it("getSettingsSnapshot matches getSettings' OS-preference fallback with no stored settings", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q === "(prefers-color-scheme: light)",
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    expect(getSettingsSnapshot()).toEqual(getSettings());
    expect(getSettingsSnapshot().backgroundId).toBe("light-white");
    vi.unstubAllGlobals();
  });
});
