import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const INDEX = {
  dsa: [
    {
      heading: "Patterns",
      cards: [
        {
          title: "Sliding Window",
          path: "./content/dsa/patterns/sliding-window.md",
          slug: "sliding-window",
          description: "A window slides over the array.",
        },
        {
          title: "Two Pointers",
          path: "./content/dsa/patterns/two-pointers.md",
          slug: "two-pointers",
          description: "Two indices move through a sequence.",
        },
      ],
    },
    {
      heading: "Data Structures",
      cards: [
        {
          title: "Hash Table",
          path: "./content/dsa/data-structures/hash-table.md",
          slug: "hash-table",
          description: "Maps keys to buckets.",
        },
      ],
    },
  ],
};
const SYNONYMS = { map: ["hash table"] };

import { _resetSearchEntriesCache } from "@/lib/search";
import { _setSynonyms } from "@/lib/search/synonyms";
import { SearchModal } from "./SearchModal";

beforeEach(() => {
  push.mockClear();
  localStorage.clear();
  _resetSearchEntriesCache();
  _setSynonyms({});
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(url.includes("synonyms") ? SYNONYMS : INDEX),
      }),
    ),
  );
});

async function open() {
  render(<SearchModal />);
  act(() => {
    fireEvent.keyDown(document, { key: "k", metaKey: true });
  });
  await waitFor(() => expect(screen.getByLabelText("Search all wikis")).toBeTruthy());
}

describe("SearchModal", () => {
  it("opens on ⌘K and ranks a title match first", async () => {
    await open();
    fireEvent.change(screen.getByLabelText("Search all wikis"), { target: { value: "sliding" } });
    await waitFor(() => {
      const titles = screen.getAllByText((_, el) => el?.className === "gsearch-result-title");
      expect(titles[0]?.textContent).toContain("Sliding Window");
    });
  });

  it("section-filter mode ('>') groups by section", async () => {
    await open();
    fireEvent.change(screen.getByLabelText("Search all wikis"), { target: { value: ">patterns" } });
    await waitFor(() => {
      expect(screen.getByText(/· Patterns/)).toBeTruthy();
      expect(screen.getByText("Two Pointers")).toBeTruthy();
    });
  });

  it("synonyms: 'map' surfaces Hash Table", async () => {
    _setSynonyms(SYNONYMS);
    await open();
    fireEvent.change(screen.getByLabelText("Search all wikis"), { target: { value: "map" } });
    await waitFor(() => expect(screen.getByText("Hash Table")).toBeTruthy());
  });

  it("arrow-down + Enter navigates and records the recent search", async () => {
    await open();
    const input = screen.getByLabelText("Search all wikis");
    fireEvent.change(input, { target: { value: "pointers" } });
    await waitFor(() =>
      expect(document.querySelector(".gsearch-result-title")?.textContent).toContain(
        "Two Pointers",
      ),
    );
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/dsa/patterns/two-pointers/");
    expect(JSON.parse(localStorage.getItem("wiki-recent-searches") ?? "[]")).toContain("pointers");
  });

  it("shows recent searches on an empty query", async () => {
    localStorage.setItem("wiki-recent-searches", JSON.stringify(["sliding window"]));
    await open();
    expect(screen.getByText("sliding window")).toBeTruthy();
  });
});
