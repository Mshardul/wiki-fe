import { readFileSync } from "node:fs";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminView } from "@/components/admin/AdminView";
import { Topbar } from "@/components/chrome/Topbar";
import { assembleSiteHealth } from "@/lib/admin/reports";
import { CANONICAL_BASE } from "@/lib/config";
import type { BrokenLinks } from "@/lib/content/broken-links";
import { getManifest } from "@/lib/content/manifest";

export const metadata: Metadata = {
  title: "Admin",
  alternates: { canonical: `${CANONICAL_BASE}/admin/` },
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const broken = JSON.parse(
    readFileSync("lib/content/generated/broken-links.json", "utf8"),
  ) as BrokenLinks;
  const reports = assembleSiteHealth(broken, await getManifest());

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
          <nav className="breadcrumb" aria-label="Breadcrumb" id="admin-breadcrumb">
            <Link href="/">Home</Link>
            <span className="breadcrumb-sep" aria-hidden="true">
              /
            </span>
            <span>Admin</span>
          </nav>
        }
      />
      <main className="admin-main">
        <h1 className="visually-hidden">Admin</h1>
        <AdminView reports={reports} />
      </main>
    </>
  );
}
