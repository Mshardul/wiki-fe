import { WIKIS, escHtml } from "../state.js";
import { getCachedAt, listCachedArticlePaths, removeArticleDownload } from "../storage/offline.js";
import { fetchPrebuiltSearchIndex, normalizePath, setBreadcrumb } from "./nav-utils.js";
import { showView } from "./router.js";

/* ═══════════════════════════════════════════════════════════════
   OFFLINE SHELF
   Lists every article currently saved for offline reading, grouped by wiki,
   resolved against the prebuilt search index for titles. Reflects
   online/offline status reactively via the browser's online/offline events.
   ═══════════════════════════════════════════════════════════════ */

function _renderStatusBanner() {
  const el = document.getElementById("offline-shelf-status");
  if (!el) return;
  const online = navigator.onLine;
  el.textContent = online ? "Online" : "Offline - showing what's available";
  el.classList.toggle("offline-shelf-status--offline", !online);
}

function _formatCachedAt(timestamp) {
  if (!timestamp) return "";
  const days = Math.floor((Date.now() - timestamp) / 86_400_000);
  if (days <= 0) return "Cached today";
  if (days === 1) return "Cached yesterday";
  if (days < 30) return `Cached ${days}d ago`;
  return `Cached ${new Date(timestamp).toLocaleDateString()}`;
}

function _renderGroups(byWiki, prebuiltIndex) {
  const container = document.getElementById("offline-shelf-groups");
  const wikiIds = Object.keys(byWiki).filter((id) => byWiki[id].length);

  if (!wikiIds.length) {
    container.innerHTML =
      '<p class="offline-shelf-empty">No articles saved for offline reading yet. Open an article and tap the download icon to add it here.</p>';
    return;
  }

  container.innerHTML = wikiIds
    .map((wikiId) => {
      const wiki = WIKIS.find((w) => w.id === wikiId);
      const title = wiki?.title || wikiId;
      const sections = prebuiltIndex?.[wikiId] || [];
      const titleByPath = new Map();
      for (const section of sections) {
        for (const card of section.cards) titleByPath.set(normalizePath(card.path), card.title);
      }

      const paths = byWiki[wikiId].slice().sort();
      return `
    <section class="offline-shelf-group">
      <h2 class="offline-shelf-wiki-title">${escHtml(title)}</h2>
      <ul class="offline-shelf-list">
        ${paths
          .map((path) => {
            const cardTitle = titleByPath.get(path) || path.split("/").pop();
            const cachedAtLabel = _formatCachedAt(getCachedAt(path));
            return `
          <li class="offline-shelf-entry"
              role="button" tabindex="0"
              onclick="navigateToContent('${wikiId}','${encodeURIComponent(
                path,
              )}','${encodeURIComponent(cardTitle)}')"
              onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
            <svg class="icon"><use href="#icon-check"></use></svg>
            <span class="offline-shelf-entry-body">
              <span class="offline-shelf-entry-title">${escHtml(cardTitle)}</span>
              ${cachedAtLabel ? `<span class="offline-shelf-entry-date">${escHtml(cachedAtLabel)}</span>` : ""}
            </span>
            <button type="button" class="offline-shelf-evict-btn"
                    title="Remove from offline storage"
                    aria-label="Remove ${escHtml(cardTitle)} from offline storage"
                    onclick="event.stopPropagation();evictOfflineArticle('${encodeURIComponent(path)}')">
              <svg class="icon"><use href="#icon-x"></use></svg>
            </button>
          </li>`;
          })
          .join("")}
      </ul>
    </section>`;
    })
    .join("");
}

let _wired = false;
function _wireReactiveStatus() {
  if (_wired) return;
  _wired = true;
  window.addEventListener("online", _renderStatusBanner);
  window.addEventListener("offline", _renderStatusBanner);
}

async function renderOfflineShelf() {
  setBreadcrumb("offline-shelf-breadcrumb", [
    { label: "Home", href: "#" },
    { label: "Offline Shelf" },
  ]);
  _wireReactiveStatus();
  _renderStatusBanner();

  showView("view-offline-shelf");

  const container = document.getElementById("offline-shelf-groups");
  container.innerHTML = '<p class="offline-shelf-empty">Loading…</p>';

  try {
    const [byWiki, prebuiltIndex] = await Promise.all([
      listCachedArticlePaths(),
      fetchPrebuiltSearchIndex(),
    ]);
    _renderGroups(byWiki, prebuiltIndex);
  } catch {
    container.innerHTML = '<p class="offline-shelf-empty">Failed to load offline shelf.</p>';
  }
}

async function evictOfflineArticle(encodedPath) {
  const path = decodeURIComponent(encodedPath);
  await removeArticleDownload(path);
  renderOfflineShelf();
}

export { renderOfflineShelf, evictOfflineArticle };
