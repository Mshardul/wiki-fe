"use client";

import type { ReactNode } from "react";

interface TopbarProps {
  variant?: "page" | "content";
  back?: ReactNode;
  breadcrumb?: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
}

// Ported from the topbar markup in index.html + css/components/topbar.css.
export function Topbar({ variant = "page", back, breadcrumb, title, actions }: TopbarProps) {
  if (variant === "content") {
    return (
      <header className="content-topbar">
        <div className="topbar-inner">
          <div className="topbar-side">
            {back}
            {breadcrumb}
          </div>
          <div className="topbar-title">{title}</div>
          <div className="topbar-side topbar-side--end">{actions}</div>
        </div>
      </header>
    );
  }
  return (
    <header className="page-topbar">
      <div className="topbar-inner">
        {back}
        {breadcrumb}
        {actions}
      </div>
    </header>
  );
}
