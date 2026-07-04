import { WIKIS, escHtml, state } from "../state.js";

function mountDebugOverlay() {
  const el = document.createElement("div");
  el.id = "debug-overlay";
  el.className = "debug-overlay";

  const header = document.createElement("div");
  header.className = "debug-header";
  const titleSpan = document.createElement("span");
  titleSpan.className = "debug-title";
  titleSpan.textContent = "Debug";
  const closeBtn = document.createElement("button");
  closeBtn.className = "debug-close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", () => el.remove());
  header.appendChild(titleSpan);
  header.appendChild(closeBtn);

  const body = document.createElement("div");
  body.className = "debug-body";
  el.appendChild(header);
  el.appendChild(body);
  document.body.appendChild(el);

  function refresh() {
    const rows = [
      ["View", state.currentView || "-"],
      ["Wiki", state.currentWikiId || "-"],
      ["File", state.currentFilePath || "-"],
      ["Wikis", String(WIKIS.length)],
      ["SW", "serviceWorker" in navigator ? "supported" : "none"],
      ["Cache API", "caches" in window ? "supported" : "none"],
      ["Clipboard", navigator.clipboard ? "async" : "execCommand"],
      ["Theme", document.documentElement.getAttribute("data-theme") || "dark"],
    ];
    body.innerHTML = rows
      .map(
        ([k, v]) =>
          `<div class="debug-row"><span class="debug-key">${escHtml(
            k,
          )}</span><span class="debug-val">${escHtml(String(v))}</span></div>`,
      )
      .join("");
  }

  refresh();
  document.addEventListener("wiki:themechange", refresh);
  window.addEventListener("hashchange", () => setTimeout(refresh, 100));
}

export { mountDebugOverlay };
