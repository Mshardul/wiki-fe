import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { addToRecents } from "@/lib/storage/recents";
import { BookmarksStrip } from "./BookmarksStrip";
import { RecentsStrip } from "./RecentsStrip";

vi.mock("@/lib/api", () => ({ api: { recents: { add: vi.fn().mockResolvedValue(undefined) } } }));
vi.mock("@/lib/storage/session", () => ({ getSession: () => ({ user: null, status: "out" }) }));

beforeEach(() => localStorage.clear());

describe("RecentsStrip", () => {
  it("shows recent visits for the current wiki, newest first", () => {
    addToRecents({ wikiId: "dsa", path: "content/dsa/a.md", title: "A", slug: ["a"] });
    addToRecents({ wikiId: "dsa", path: "content/dsa/b.md", title: "B", slug: ["b"] });
    addToRecents({
      wikiId: "system-design",
      path: "content/system-design/x.md",
      title: "X",
      slug: ["x"],
    });
    render(<RecentsStrip wikiId="dsa" />);
    const chips = screen.getAllByRole("link");
    expect(chips.map((c) => c.textContent)).toEqual(["B", "A"]);
  });

  it("renders nothing without recents for the wiki", () => {
    const { container } = render(<RecentsStrip wikiId="dsa" />);
    expect(container.firstChild).toBeNull();
  });
});

describe("BookmarksStrip", () => {
  it("renders nothing when the wiki has no bookmarks", () => {
    const { container } = render(<BookmarksStrip wikiId="dsa" />);
    expect(container.firstChild).toBeNull();
  });
});
