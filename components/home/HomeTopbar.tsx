"use client";

import Link from "next/link";
import { AuthButton } from "@/components/auth/AuthButton";

export function HomeTopbar() {
  return (
    <div className="page-topbar home-topbar">
      <div className="topbar-inner">
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
