import Link from "next/link";
import type { ReactNode } from "react";
import { Topbar } from "@/components/chrome/Topbar";

export interface Crumb {
  label: string;
  href?: string;
}

interface DashboardShellProps {
  title: string;
  subtitle: string;
  crumbs: Crumb[];
  children: ReactNode;
}

export function DashboardShell({ title, subtitle, crumbs, children }: DashboardShellProps) {
  return (
    <>
      <Topbar
        variant="content"
        back={
          <Link className="back-btn" href="/">
            <svg className="icon" aria-hidden="true">
              <use href="#icon-chevron-left" />
            </svg>
            <span className="back-btn-label">Home</span>
          </Link>
        }
        breadcrumb={
          <nav className="breadcrumb" aria-label="Breadcrumb" id="dashboard-breadcrumb">
            {crumbs.map((c, i) => (
              <span key={`${c.label}-${i}`}>
                {i > 0 && (
                  <span className="breadcrumb-sep" aria-hidden="true">
                    /
                  </span>
                )}
                {c.href ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
              </span>
            ))}
          </nav>
        }
      />
      <main className="dashboard-main" id="view-dashboard">
        <header>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </header>
        {children}
      </main>
    </>
  );
}
