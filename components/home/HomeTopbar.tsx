"use client";

import Link from "next/link";
import { AdminNavButton } from "@/components/admin/AdminNavButton";
import { AuthButton } from "@/components/auth/AuthButton";

export function HomeTopbar() {
  return (
    <div className="page-topbar home-topbar">
      <div className="topbar-inner">
        <AdminNavButton />
        <Link
          className="topbar-icon-btn"
          href="/dashboard/"
          title="Dashboard"
          aria-label="Dashboard"
          data-action="dashboard-open"
        >
          <svg className="icon" aria-hidden="true">
            <use href="#icon-dashboard" />
          </svg>
        </Link>
        <Link
          className="topbar-icon-btn"
          href="/changelog/"
          title="Changelog"
          aria-label="Changelog"
          data-action="changelog-open"
        >
          <svg className="icon" aria-hidden="true">
            <use href="#icon-changelog" />
          </svg>
        </Link>
        <Link
          className="topbar-icon-btn"
          href="/offline/"
          title="Offline shelf"
          aria-label="Offline shelf"
        >
          <svg className="icon" aria-hidden="true">
            <use href="#icon-download" />
          </svg>
        </Link>
        <button
          type="button"
          className="topbar-icon-btn"
          title="Search (⌘K)"
          aria-label="Search"
          onClick={() => document.dispatchEvent(new CustomEvent("wiki:open-search"))}
        >
          <svg className="icon" aria-hidden="true">
            <use href="#icon-search" />
          </svg>
        </button>
        <button
          type="button"
          className="topbar-icon-btn"
          title="Preferences (,)"
          aria-label="Preferences"
          onClick={() => document.dispatchEvent(new CustomEvent("wiki:open-settings"))}
        >
          <svg className="icon" aria-hidden="true">
            <use href="#icon-settings" />
          </svg>
        </button>
        <AuthButton />
      </div>
    </div>
  );
}
