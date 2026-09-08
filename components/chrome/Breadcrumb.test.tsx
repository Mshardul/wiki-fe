import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildCrumbs, pageTitleFor } from "./Breadcrumb";

vi.mock("next/navigation", () => ({ usePathname: () => "/dsa/patterns/sliding-window/" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("Breadcrumb", () => {
  it("builds a crumb trail with a labelled vertical and a title-cased leaf", () => {
    const crumbs = buildCrumbs("/dsa/patterns/sliding-window/", "Sliding Window");
    expect(crumbs.map((c) => c.label)).toEqual(["DSA", "Patterns", "Sliding Window"]);
    expect(crumbs[0]?.href).toBe("/dsa/");
    expect(crumbs[2]?.href).toBeUndefined();
  });

  it("derives the document title as leaf + vertical (matching server metadata)", () => {
    const crumbs = buildCrumbs("/dsa/patterns/sliding-window/", "Sliding Window");
    expect(pageTitleFor(crumbs)).toBe("Sliding Window · DSA · Wiki");
  });

  it("renders the trail and sets document.title", async () => {
    const { Breadcrumb } = await import("./Breadcrumb");
    render(<Breadcrumb leafTitle="Sliding Window" />);
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "DSA" }).getAttribute("href")).toBe("/dsa/");
    expect(document.title).toBe("Sliding Window · DSA · Wiki");
  });
});
