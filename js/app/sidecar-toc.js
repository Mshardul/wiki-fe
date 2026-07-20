import { state } from "../state.js";

const channel = "BroadcastChannel" in window ? new BroadcastChannel("wiki-sidecar-toc") : null;
let _win = null;

function tocSignature() {
  const nav = document.getElementById("toc-nav");
  return `${state.currentFilePath || ""}:${nav?.children.length || 0}`;
}

function currentPayload() {
  const nav = document.getElementById("toc-nav");
  const html = nav?.innerHTML || "";
  const currentIds = [...(nav?.querySelectorAll(".toc-current") || [])].map((el) =>
    el.getAttribute("href")?.slice(1),
  );
  const passedIds = [...(nav?.querySelectorAll(".toc-passed") || [])].map((el) =>
    el.getAttribute("href")?.slice(1),
  );
  return {
    type: "state",
    html,
    sig: tocSignature(),
    articleTitle: state.currentTitle || "On this page",
    currentIds,
    passedIds,
  };
}

function pushState() {
  if (!channel || !_win || _win.closed) return;
  channel.postMessage(currentPayload());
}

function openSidecarToc() {
  if (!channel) return false;
  if (_win && !_win.closed) {
    _win.focus();
    return true;
  }
  _win = window.open(
    "./toc-companion.html",
    "wiki-sidecar-toc",
    "width=320,height=640,menubar=no,toolbar=no,location=no,status=no",
  );
  if (!_win) return false; // popup blocked
  pushState();
  return true;
}

function isSidecarTocOpen() {
  return !!(_win && !_win.closed);
}

if (channel) {
  channel.onmessage = (e) => {
    const data = e.data;
    if (data?.type === "ready") {
      pushState();
    } else if (data?.type === "navigate" && data.id) {
      const heading = document.getElementById(data.id);
      heading?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (data?.type === "closed") {
      _win = null;
    }
  };
}

document.addEventListener("wiki:toc-updated", pushState);
window.addEventListener(
  "scroll",
  () => {
    if (isSidecarTocOpen()) pushState();
  },
  { passive: true },
);

export { openSidecarToc, isSidecarTocOpen };
