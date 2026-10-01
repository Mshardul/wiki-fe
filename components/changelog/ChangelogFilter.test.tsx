import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChangelogFilter } from "./ChangelogFilter";

const GROUPS = [
  {
    date: "2026-07-10",
    entries: [
      {
        text: "`message-queues.md` - expanded",
        filenames: ["message-queues.md"],
        parts: [
          {
            type: "link" as const,
            filename: "message-queues.md",
            href: "/system-design/components/message-queues/",
          },
          { type: "text" as const, value: " - expanded" },
        ],
      },
      {
        text: "`unknown-file.md` - new",
        filenames: ["unknown-file.md"],
        parts: [
          { type: "code" as const, filename: "unknown-file.md" },
          { type: "text" as const, value: " - new" },
        ],
      },
    ],
  },
  {
    date: "2026-07-05",
    entries: [
      {
        text: "`message-queues.md` - new article",
        filenames: ["message-queues.md"],
        parts: [
          {
            type: "link" as const,
            filename: "message-queues.md",
            href: "/system-design/components/message-queues/",
          },
          { type: "text" as const, value: " - new article" },
        ],
      },
    ],
  },
];

describe("ChangelogFilter", () => {
  it("filters entries by filename fragment and hides empty groups", () => {
    render(<ChangelogFilter groups={GROUPS} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);

    fireEvent.change(screen.getByLabelText("Filter changelog entries by filename"), {
      target: { value: "unknown-file" },
    });

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("unknown-file.md")).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
  });

  it("cleared filter shows all entries again", () => {
    render(<ChangelogFilter groups={GROUPS} />);
    const input = screen.getByLabelText("Filter changelog entries by filename");
    fireEvent.change(input, { target: { value: "unknown-file" } });
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
