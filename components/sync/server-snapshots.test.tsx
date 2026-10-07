import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
}));

import { BookmarksStrip } from "@/components/home/BookmarksStrip";
import { RecentsStrip } from "@/components/home/RecentsStrip";
import { SearchModal } from "@/components/search/SearchModal";
import { useSession } from "./useSession";

function SessionProbe() {
  return <span>{useSession().status}</span>;
}

const CASES: [string, () => React.ReactElement][] = [
  ["useSession", () => <SessionProbe />],
  ["RecentsStrip", () => <RecentsStrip wikiId="dsa" />],
  ["BookmarksStrip", () => <BookmarksStrip wikiId="dsa" />],
  ["SearchModal", () => <SearchModal />],
];

afterEach(() => vi.restoreAllMocks());

describe("server snapshots are referentially stable", () => {
  // A fresh object per call makes React warn "getServerSnapshot should be cached" while hydrating.
  it.each(CASES)("%s hydrates without the uncached-snapshot warning", (_name, make) => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const container = document.createElement("div");
    container.innerHTML = renderToString(make());
    act(() => {
      hydrateRoot(container, make());
    });
    const warned = errors.mock.calls.some((c) => String(c[0]).includes("getServerSnapshot"));
    expect(warned).toBe(false);
  });
});
