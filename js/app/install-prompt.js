import { showToast } from "../render/toast.js";
import { dismissIosNudge, isIosNudgeDismissed } from "../storage/install-prompt.js";

let deferredPrompt = null;

function _isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

function _isIos() {
  return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
}

function initInstallPrompt() {
  if (_isStandalone()) return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const promptInstall = async () => {
      deferredPrompt?.prompt();
      await deferredPrompt?.userChoice;
      deferredPrompt = null;
    };
    showToast(
      "Install this wiki for offline access and quicker launch.",
      8000,
      promptInstall,
      "Install",
      null,
      -1,
    );
  });

  if (_isIos() && !isIosNudgeDismissed()) {
    // Low priority: this nudge is informational, not time-sensitive - a SW-update or session toast queued shortly after should overtake it rather than wait out its full 8s.
    showToast(
      "Add to Home Screen: tap Share, then “Add to Home Screen”.",
      8000,
      dismissIosNudge,
      "Got it",
      null,
      -1,
    );
  }
}

export { initInstallPrompt };
