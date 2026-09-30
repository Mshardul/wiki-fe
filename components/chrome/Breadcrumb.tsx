"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const VERTICAL_LABELS: Record<string, string> = {
  dsa: "DSA",
  "system-design": "System Design",
};

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export interface Crumb {
  label: string;
  href?: string;
}

export function buildCrumbs(pathname: string, leafTitle?: string): Crumb[] {
  const segments = pathname
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);
  if (!segments.length) return [];

  const crumbs: Crumb[] = [];
  segments.forEach((seg, i) => {
    const isLast = i === segments.length - 1;
    const label =
      i === 0
        ? (VERTICAL_LABELS[seg] ?? titleCase(seg))
        : isLast && leafTitle
          ? leafTitle
          : titleCase(seg);
    const href = isLast ? undefined : `/${segments.slice(0, i + 1).join("/")}/`;
    crumbs.push({ label, href });
  });
  return crumbs;
}

interface BreadcrumbProps {
  leafTitle?: string;
}

// document.title is owned by route metadata; deriving it from the pathname mislabels the SW offline fallback.
export function Breadcrumb({ leafTitle }: BreadcrumbProps) {
  const pathname = usePathname() ?? "/";
  const crumbs = buildCrumbs(pathname, leafTitle);

  if (!crumbs.length) return null;

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {crumbs.map((c, i) => (
        <span key={`${c.label}-${i}`}>
          {i > 0 && <span className="breadcrumb-sep">›</span>}
          {c.href ? (
            <Link className="breadcrumb-link" href={c.href}>
              {c.label}
            </Link>
          ) : (
            <span>{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
