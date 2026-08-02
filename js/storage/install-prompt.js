const IOS_NUDGE_KEY = "wiki-ios-install-nudge-dismissed";

function isIosNudgeDismissed() {
  return localStorage.getItem(IOS_NUDGE_KEY) === "1";
}

function dismissIosNudge() {
  localStorage.setItem(IOS_NUDGE_KEY, "1");
}

export { isIosNudgeDismissed, dismissIosNudge };
