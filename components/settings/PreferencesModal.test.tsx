import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/toast", () => ({ showToast: vi.fn() }));

import { getSettings } from "@/lib/storage/settings";
import { PreferencesModal } from "./PreferencesModal";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.cssText = "";
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ global: [{ keys: ["⌘K"], description: "Open search" }] }),
    }),
  );
});

function open(tab?: string) {
  render(<PreferencesModal />);
  act(() => {
    document.dispatchEvent(
      new CustomEvent("wiki:open-settings", tab ? { detail: { tab } } : undefined),
    );
  });
}

describe("PreferencesModal", () => {
  it("opens on wiki:open-settings, default Appearance tab", () => {
    open();
    expect(screen.getByRole("dialog", { name: "Preferences" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Appearance", selected: true })).toBeTruthy();
  });

  it("picking a theme updates the stored settings + CSS vars", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    expect(getSettings().backgroundId).toBe("light-white");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("changing font size persists", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Large" }));
    expect(getSettings().fontSize).toBe("L");
  });

  it("keyboard tab lists shortcuts from shortcuts.json", async () => {
    open("keyboard");
    await waitFor(() => expect(screen.getByText("Open search")).toBeTruthy());
    expect(screen.getByText("⌘K")).toBeTruthy();
  });

  it("advanced tab: clear-data confirms then clears", () => {
    localStorage.setItem(
      "wiki-bookmarks",
      JSON.stringify([{ wikiId: "dsa", path: "x", slug: "x", title: "X", wikiTitle: "D" }]),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    localStorage.setItem("wiki-recent-searches", '["hi"]');
    open("advanced");
    fireEvent.click(screen.getByRole("button", { name: "Clear everything" }));
    expect(localStorage.getItem("wiki-bookmarks")).toBe("[]");
    expect(localStorage.getItem("wiki-recent-searches")).toBeNull();
  });
});
