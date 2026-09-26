import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetToasts, subscribeToast } from "@/lib/toast";
import { InstallPrompt } from "./InstallPrompt";
import { IosNudge } from "./IosNudge";

function currentToast(): string | undefined {
  let msg: string | undefined;
  const unsub = subscribeToast((t) => {
    if (t) msg = t.message;
  });
  unsub();
  return msg;
}

beforeEach(() => {
  _resetToasts();
  localStorage.clear();
  vi.spyOn(window, "matchMedia").mockReturnValue({ matches: false } as MediaQueryList);
});
afterEach(() => vi.restoreAllMocks());

describe("InstallPrompt", () => {
  it("shows an install toast on beforeinstallprompt", () => {
    render(<InstallPrompt />);
    const e = new Event("beforeinstallprompt") as Event & { prompt?: unknown };
    e.prompt = vi.fn().mockResolvedValue(undefined);
    window.dispatchEvent(e);
    expect(currentToast()).toMatch(/Install this wiki/);
  });
});

describe("IosNudge", () => {
  it("nudges on iOS when not dismissed", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("iPhone");
    render(<IosNudge />);
    expect(currentToast()).toMatch(/Add to Home Screen/);
  });

  it("stays silent once dismissed", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("iPhone");
    localStorage.setItem("wiki-ios-install-nudge-dismissed", "1");
    render(<IosNudge />);
    expect(currentToast()).toBeUndefined();
  });

  it("stays silent off iOS", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Macintosh");
    render(<IosNudge />);
    expect(currentToast()).toBeUndefined();
  });
});
