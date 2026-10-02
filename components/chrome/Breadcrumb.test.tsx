import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildCrumbs } from "./Breadcrumb";

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
    expect(crumbs[1]?.href).toBeUndefined();
    expect(crumbs[2]?.href).toBeUndefined();
  });

  it("renders the trail and leaves document.title to Next metadata", async () => {
    document.title = "Sliding Window · Data Structures & Algorithms · Wiki";
    const { Breadcrumb } = await import("./Breadcrumb");
    render(<Breadcrumb leafTitle="Sliding Window" />);
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "DSA" }).getAttribute("href")).toBe("/dsa/");
    expect(document.title).toBe("Sliding Window · Data Structures & Algorithms · Wiki");
  });
});
