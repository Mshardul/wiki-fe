"use client";

import Link from "next/link";
import { AuthButton } from "@/components/auth/AuthButton";
import { Breadcrumb } from "./Breadcrumb";
import { Topbar } from "./Topbar";

// The article-page content topbar. Ported from the .content-topbar markup in index.html.
export function ReaderTopbar({ leafTitle, backHref }: { leafTitle: string; backHref: string }) {
  return (
    <Topbar
      variant="content"
      back={
        <Link className="back-btn" href={backHref}>
          <svg className="icon" aria-hidden="true">
            <use href="#icon-chevron-left" />
          </svg>
          <span className="back-btn-label">Back</span>
        </Link>
      }
      breadcrumb={<Breadcrumb leafTitle={leafTitle} />}
      actions={
        <>
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
        </>
      }
    />
  );
}
