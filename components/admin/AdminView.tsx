"use client";

import { useEffect, useState } from "react";
import { BrokenLinksTable, OrphansTable } from "@/components/admin/ReportTable";
import { useSession } from "@/components/sync/useSession";
import type { SiteHealthReports } from "@/lib/admin/reports";
import { ApiError, api, type User } from "@/lib/api";
import { showToast } from "@/lib/toast";

type Tab = "users" | "site-health";

/** BE AdminUser fields the list endpoint returns beyond the shared User shape. */
interface AdminUser extends User {
  email_verified?: boolean;
  created_at?: string;
}

interface AdminViewProps {
  reports: SiteHealthReports;
}

export function AdminView({ reports }: AdminViewProps) {
  const { user, status } = useSession();
  const [tab, setTab] = useState<Tab>("users");

  if (status === "loading") {
    return (
      <div id="admin-content">
        <p className="admin-empty">Loading…</p>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div id="admin-content">
        <p className="admin-empty">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  return (
    <div id="admin-content">
      <div className="admin-tabs" role="tablist">
        <button
          type="button"
          className={`admin-tab${tab === "users" ? " admin-tab--active" : ""}`}
          data-tab="users"
          role="tab"
          aria-selected={tab === "users"}
          onClick={() => setTab("users")}
        >
          Users
        </button>
        <button
          type="button"
          className={`admin-tab${tab === "site-health" ? " admin-tab--active" : ""}`}
          data-tab="site-health"
          role="tab"
          aria-selected={tab === "site-health"}
          onClick={() => setTab("site-health")}
        >
          Site Health
        </button>
      </div>
      <div id="admin-tab-body" className="admin-tab-body">
        {tab === "site-health" ? (
          <>
            <BrokenLinksTable rows={reports.brokenLinks} />
            <OrphansTable rows={reports.orphans} />
          </>
        ) : (
          <UsersPanel />
        )}
      </div>
    </div>
  );
}

function UsersPanel() {
  const [users, setUsers] = useState<AdminUser[] | "loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.admin
      .listUsers()
      .then((list) => {
        if (!cancelled) setUsers(list);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setUsers("error");
        setErrorMsg(err instanceof ApiError ? err.message : "Failed to load users.");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  if (users === "loading") return <p className="admin-empty">Loading users…</p>;
  if (users === "error") {
    return <p className="admin-empty">Failed to load users: {errorMsg}</p>;
  }
  if (users.length === 0) return <p className="admin-empty">No users found.</p>;

  return <UsersTable users={users} onChanged={() => setReloadToken((n) => n + 1)} />;
}

function UsersTable({ users, onChanged }: { users: AdminUser[]; onChanged: () => void }) {
  async function toggleRole(u: AdminUser) {
    const next = u.role === "admin" ? "user" : "admin";
    try {
      await api.admin.updateUserRole(u.id, next);
      showToast(`User ${next === "admin" ? "promoted" : "demoted"}.`);
      onChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update role.");
    }
  }

  async function toggleStatus(u: AdminUser) {
    try {
      await api.admin.updateUserStatus(u.id, !u.is_active);
      showToast(`User ${u.is_active ? "deactivated" : "reactivated"}.`);
      onChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update status.");
    }
  }

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Email</th>
          <th>Role</th>
          <th>Status</th>
          <th>Verified</th>
          <th>Created</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id} data-user-id={u.id}>
            <td>{u.email}</td>
            <td>
              <span className={`admin-badge admin-badge--${u.role ?? "user"}`}>{u.role}</span>
            </td>
            <td>
              <span className={`admin-badge admin-badge--${u.is_active ? "active" : "inactive"}`}>
                {u.is_active ? "active" : "deactivated"}
              </span>
            </td>
            <td>{u.email_verified || u.is_verified ? "yes" : "no"}</td>
            <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
            <td className="admin-table-actions">
              <button
                type="button"
                className="admin-action-btn"
                data-action="admin-toggle-role"
                data-user-id={u.id}
                data-current-role={u.role}
                onClick={() => {
                  void toggleRole(u);
                }}
              >
                {u.role === "admin" ? "Demote" : "Promote"}
              </button>
              <button
                type="button"
                className="admin-action-btn"
                data-action="admin-toggle-status"
                data-user-id={u.id}
                data-current-active={String(!!u.is_active)}
                onClick={() => {
                  void toggleStatus(u);
                }}
              >
                {u.is_active ? "Deactivate" : "Reactivate"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
