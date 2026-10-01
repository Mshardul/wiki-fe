"use client";

import Link from "next/link";
import { useSession } from "@/components/sync/useSession";

export function AdminNavButton() {
  const { user, status } = useSession();
  const show = status === "in" && user?.role === "admin";

  return (
    <Link
      id="admin-nav-btn"
      className="topbar-icon-btn"
      href="/admin/"
      title="Admin"
      aria-label="Admin"
      data-action="admin-open"
      hidden={!show}
    >
      <svg className="icon" aria-hidden="true">
        <use href="#icon-shield" />
      </svg>
    </Link>
  );
}
