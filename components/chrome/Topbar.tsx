"use client";

import type { ReactNode } from "react";

interface TopbarProps {
  variant?: "page" | "content";
  back?: ReactNode;
  breadcrumb?: ReactNode;
  title?: ReactNode;
  titleVisible?: boolean;
  actions?: ReactNode;
}

export function Topbar({
  variant = "page",
  back,
  breadcrumb,
  title,
  titleVisible = false,
  actions,
}: TopbarProps) {
  if (variant === "content") {
    return (
      <header className="content-topbar">
        <div className="topbar-inner">
          <div className="topbar-side">
            {back}
            {breadcrumb}
          </div>
          <div className={`topbar-title${titleVisible ? " visible" : ""}`}>{title}</div>
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
