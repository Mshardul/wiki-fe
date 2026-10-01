import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { _clearDataJsonCache } from "@/lib/storage/data-json";
import { _clearStructuresCacheForTests, ComplexityCompare } from "./ComplexityCompare";

const SEARCH_INDEX = {
  dsa: [
    {
      heading: "Data Structures",
      cards: [
        {
          title: "Array",
          path: "./content/dsa/data-structures/array.md",
          slug: "array",
        },
        {
          title: "Hash Table",
          path: "./content/dsa/data-structures/hash-table.md",
          slug: "hash-table",
        },
        {
          title: "Linked List",
          path: "./content/dsa/data-structures/linked-list.md",
          slug: "linked-list",
        },
        {
          title: "Stack",
          path: "./content/dsa/data-structures/stack.md",
          slug: "stack",
        },
        {
          title: "Queue",
          path: "./content/dsa/data-structures/queue.md",
          slug: "queue",
        },
      ],
    },
  ],
};

const COMPLEXITY_TABLES = {
  "data-structures/array": {
    columns: ["Time", "Space"],
    rows: [
      { operation: "Access", values: { Time: "O(1)", Space: "O(1)" } },
      { operation: "Search", values: { Time: "O(n)", Space: "O(1)" } },
    ],
  },
  "data-structures/hash-table": {
    columns: ["Average", "Worst"],
    rows: [
      { operation: "Search", values: { Average: "O(1)", Worst: "O(n)" } },
      { operation: "Insert", values: { Average: "O(1)", Worst: "O(n)" } },
    ],
  },
  "data-structures/linked-list": {
    columns: ["Time"],
    rows: [{ operation: "Access", values: { Time: "O(n)" } }],
  },
  "data-structures/stack": {
    columns: ["Time"],
    rows: [{ operation: "Push", values: { Time: "O(1)" } }],
  },
  // queue intentionally missing — exercises the "N of M had a table" status
};

function mockFetch(searchIndex: unknown = SEARCH_INDEX, tables: unknown = COMPLEXITY_TABLES) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (String(url).includes("search-index")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(searchIndex) });
      }
      if (String(url).includes("complexity-tables")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(tables) });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    }),
  );
}

function open() {
  render(<ComplexityCompare />);
  act(() => {
    document.dispatchEvent(new CustomEvent("wiki:open-complexity-compare"));
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  _clearStructuresCacheForTests();
  _clearDataJsonCache();
  mockFetch();
});

describe("ComplexityCompare", () => {
  it("opens with a picker list of DS structures", async () => {
    open();
    await waitFor(() => expect(screen.getByText("Array")).toBeTruthy());
    expect(screen.getByText("Hash Table")).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: /Compare \(0\)/ }).disabled).toBe(
      true,
    );
  });

  it("picking 2 and running Compare renders a merged matrix", async () => {
    open();
    await waitFor(() => expect(screen.getByText("Array")).toBeTruthy());

    const list = screen.getByTestId("compare-picker-list");
    fireEvent.click(within(list).getByLabelText("Array"));
    fireEvent.click(within(list).getByLabelText("Hash Table"));
    const runBtn = screen.getByRole<HTMLButtonElement>("button", { name: /Compare \(2\)/ });
    expect(runBtn.disabled).toBe(false);

    fireEvent.click(runBtn);
    await waitFor(() => expect(screen.getByRole("table")).toBeTruthy());
    expect(screen.getByText("Comparing 2 structures.")).toBeTruthy();
    expect(screen.getAllByText("O(n)").length).toBeGreaterThan(0);
  });

  it("blocks a 5th pick at MAX_PICKS", async () => {
    open();
    await waitFor(() => expect(screen.getByText("Array")).toBeTruthy());
    const list = screen.getByTestId("compare-picker-list");
    for (const name of ["Array", "Hash Table", "Linked List", "Stack"]) {
      fireEvent.click(within(list).getByLabelText(name));
    }
    expect(within(list).getByLabelText<HTMLInputElement>("Queue").disabled).toBe(true);
  });

  it("filters the picker by search input", async () => {
    open();
    await waitFor(() => expect(screen.getByText("Array")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Filter data structures"), {
      target: { value: "hash" },
    });
    expect(screen.getByText("Hash Table")).toBeTruthy();
    expect(screen.queryByText("Array")).toBeNull();
  });

  it("resets picks when reopened", async () => {
    open();
    await waitFor(() => expect(screen.getByText("Array")).toBeTruthy());
    fireEvent.click(within(screen.getByTestId("compare-picker-list")).getByLabelText("Array"));
    fireEvent.click(screen.getByRole("button", { name: "Close comparator" }));

    act(() => {
      document.dispatchEvent(new CustomEvent("wiki:open-complexity-compare"));
    });
    await waitFor(() => expect(screen.getByText("Array")).toBeTruthy());
    const checked = screen
      .getByTestId("compare-picker-list")
      .querySelectorAll("input[type=checkbox]:checked");
    expect(checked.length).toBe(0);
  });
});
