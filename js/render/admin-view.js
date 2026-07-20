import { ApiError, api } from "../api.js";
import { escHtml } from "../state.js";
import {
  fetchPrebuiltBacklinks,
  fetchPrebuiltBrokenLinks,
  fetchPrebuiltSearchIndex,
  setBreadcrumb,
} from "./nav-utils.js";
import { showToast } from "./toast.js";

/* ═══════════════════════════════════════════════════════════════
   ADMIN PAGE
   /admin route. UX-gated on session.user.role === "admin" - not a real
   security boundary (GH Pages is static; BE independently re-checks
   get_current_admin on every admin call). Re-checks role on every load,
   no caching, per WIKI-440.
   ═══════════════════════════════════════════════════════════════ */

let _activeTab = "users";

function renderAdminDenied() {
  const container = document.getElementById("admin-content");
  container.innerHTML = `<p class="admin-empty">You don't have access to this page.</p>`;
}

function _wireTabs() {
  document.querySelectorAll(".admin-tab").forEach((btn) => {
    btn.onclick = () => {
      _activeTab = btn.dataset.tab;
      _renderActiveTab();
    };
  });
}

function _setActiveTabUI() {
  document.querySelectorAll(".admin-tab").forEach((btn) => {
    btn.classList.toggle("admin-tab--active", btn.dataset.tab === _activeTab);
  });
}

function _renderActiveTab() {
  _setActiveTabUI();
  if (_activeTab === "users") renderUsersTab();
  else renderSiteHealthTab();
}

async function renderAdminPage(user) {
  setBreadcrumb("admin-breadcrumb", [{ label: "Home", href: "#" }, { label: "Admin" }]);

  if (!user || user.role !== "admin") {
    renderAdminDenied();
    return;
  }

  const container = document.getElementById("admin-content");
  container.innerHTML = `
    <div class="admin-tabs" role="tablist">
      <button type="button" class="admin-tab" data-tab="users" role="tab">Users</button>
      <button type="button" class="admin-tab" data-tab="site-health" role="tab">Site Health</button>
    </div>
    <div id="admin-tab-body" class="admin-tab-body"></div>
  `;
  _wireTabs();
  _renderActiveTab();
}

/* ─── Users tab ─── */

function _roleBadge(role) {
  return `<span class="admin-badge admin-badge--${escHtml(role)}">${escHtml(role)}</span>`;
}

function _statusBadge(isActive) {
  return isActive
    ? `<span class="admin-badge admin-badge--active">active</span>`
    : `<span class="admin-badge admin-badge--inactive">deactivated</span>`;
}

async function renderUsersTab() {
  const body = document.getElementById("admin-tab-body");
  body.innerHTML = `<p class="admin-empty">Loading users…</p>`;

  let users;
  try {
    users = await api.admin.listUsers();
  } catch (err) {
    body.innerHTML = `<p class="admin-empty">Failed to load users${err instanceof ApiError ? `: ${escHtml(err.message)}` : ""}.</p>`;
    return;
  }

  if (!users.length) {
    body.innerHTML = `<p class="admin-empty">No users found.</p>`;
    return;
  }

  body.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Email</th>
          <th>Role</th>
          <th>Status</th>
          <th>Verified</th>
          <th>Created</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${users
          .map(
            (u) => `
        <tr data-user-id="${u.id}">
          <td>${escHtml(u.email)}</td>
          <td>${_roleBadge(u.role)}</td>
          <td>${_statusBadge(u.is_active)}</td>
          <td>${u.email_verified ? "yes" : "no"}</td>
          <td>${new Date(u.created_at).toLocaleDateString()}</td>
          <td class="admin-table-actions">
            <button type="button" class="admin-action-btn" data-action="admin-toggle-role" data-user-id="${u.id}" data-current-role="${escHtml(u.role)}">
              ${u.role === "admin" ? "Demote" : "Promote"}
            </button>
            <button type="button" class="admin-action-btn" data-action="admin-toggle-status" data-user-id="${u.id}" data-current-active="${u.is_active}">
              ${u.is_active ? "Deactivate" : "Reactivate"}
            </button>
          </td>
        </tr>`,
          )
          .join("")}
      </tbody>
    </table>
  `;

  body.querySelectorAll('[data-action="admin-toggle-role"]').forEach((btn) => {
    btn.onclick = () => _handleToggleRole(btn.dataset.userId, btn.dataset.currentRole);
  });
  body.querySelectorAll('[data-action="admin-toggle-status"]').forEach((btn) => {
    btn.onclick = () =>
      _handleToggleStatus(btn.dataset.userId, btn.dataset.currentActive === "true");
  });
}

async function _handleToggleRole(userId, currentRole) {
  const nextRole = currentRole === "admin" ? "user" : "admin";
  try {
    await api.admin.updateUserRole(userId, nextRole);
    showToast(`User ${nextRole === "admin" ? "promoted" : "demoted"}.`);
    renderUsersTab();
  } catch (err) {
    showToast(err instanceof ApiError ? err.message : "Failed to update role.");
  }
}

async function _handleToggleStatus(userId, currentActive) {
  try {
    await api.admin.updateUserStatus(userId, !currentActive);
    showToast(`User ${currentActive ? "deactivated" : "reactivated"}.`);
    renderUsersTab();
  } catch (err) {
    showToast(err instanceof ApiError ? err.message : "Failed to update status.");
  }
}

/* ─── Site health tab ─── */

async function renderSiteHealthTab() {
  const body = document.getElementById("admin-tab-body");
  body.innerHTML = `<p class="admin-empty">Loading site health…</p>`;

  const [index, backlinks, brokenLinks] = await Promise.all([
    fetchPrebuiltSearchIndex(),
    fetchPrebuiltBacklinks(),
    fetchPrebuiltBrokenLinks(),
  ]);

  if (!index || !backlinks || !brokenLinks) {
    body.innerHTML = `<p class="admin-empty">Failed to load site health data.</p>`;
    return;
  }

  const orphans = [];
  for (const sections of Object.values(index)) {
    for (const section of sections) {
      for (const card of section.cards) {
        if (!backlinks[card.path]) orphans.push(card);
      }
    }
  }

  const brokenEntries = Object.entries(brokenLinks).flatMap(([sourcePath, links]) =>
    links.map((link) => ({ sourcePath, ...link })),
  );

  body.innerHTML = `
    <section class="admin-report-section">
      <h2 class="admin-report-heading">Broken Links (${brokenEntries.length})</h2>
      ${
        brokenEntries.length
          ? `<table class="admin-table">
        <thead><tr><th>Article</th><th>Broken Target</th></tr></thead>
        <tbody>
          ${brokenEntries
            .map(
              (e) =>
                `<tr><td>${escHtml(e.title)}</td><td class="admin-mono">${escHtml(e.target)}</td></tr>`,
            )
            .join("")}
        </tbody>
      </table>`
          : `<p class="admin-empty">No broken links found.</p>`
      }
    </section>
    <section class="admin-report-section">
      <h2 class="admin-report-heading">Orphan Pages (${orphans.length})</h2>
      ${
        orphans.length
          ? `<table class="admin-table">
        <thead><tr><th>Title</th><th>Path</th></tr></thead>
        <tbody>
          ${orphans
            .map(
              (c) =>
                `<tr><td>${escHtml(c.title)}</td><td class="admin-mono">${escHtml(c.path)}</td></tr>`,
            )
            .join("")}
        </tbody>
      </table>`
          : `<p class="admin-empty">No orphan pages found.</p>`
      }
    </section>
  `;
}

export { renderAdminPage };
