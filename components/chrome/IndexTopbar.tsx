"use client";

import Link from "next/link";
import { AuthButton } from "@/components/auth/AuthButton";
import { Breadcrumb } from "./Breadcrumb";
import { Topbar } from "./Topbar";

export function IndexTopbar() {
  return (
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
      breadcrumb={<Breadcrumb />}
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
