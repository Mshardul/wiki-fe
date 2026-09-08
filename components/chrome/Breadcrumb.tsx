"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

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

// Given the current pathname (basePath already stripped by next/navigation), builds the crumb trail.
// `leafTitle` overrides the last crumb's label with the real article title when the caller knows it.
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

// Leaf + vertical only, matching the server `generateMetadata` title so there is no post-hydration flash.
export function pageTitleFor(crumbs: Crumb[]): string {
  if (!crumbs.length) return "Wiki";
  if (crumbs.length === 1) return `${crumbs[0]?.label} · Wiki`;
  const leaf = crumbs[crumbs.length - 1]?.label;
  const vertical = crumbs[0]?.label;
  return `${leaf} · ${vertical} · Wiki`;
}

interface BreadcrumbProps {
  leafTitle?: string;
  setDocumentTitle?: boolean;
}

export function Breadcrumb({ leafTitle, setDocumentTitle = true }: BreadcrumbProps) {
  const pathname = usePathname() ?? "/";
  const crumbs = buildCrumbs(pathname, leafTitle);
  const title = pageTitleFor(crumbs);

  useEffect(() => {
    if (setDocumentTitle) document.title = title;
  }, [title, setDocumentTitle]);

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
