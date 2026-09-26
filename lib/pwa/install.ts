import { getString, setString } from "@/lib/storage/local";

const IOS_NUDGE_KEY = "wiki-ios-install-nudge-dismissed";

export function isIosNudgeDismissed(): boolean {
  return getString(IOS_NUDGE_KEY) === "1";
}

export function dismissIosNudge(): void {
  setString(IOS_NUDGE_KEY, "1");
}

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
}

// The beforeinstallprompt event isn't in lib.dom yet.
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
