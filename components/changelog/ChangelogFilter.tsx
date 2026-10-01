"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type EntryPart =
  | { type: "text"; value: string }
  | { type: "link"; filename: string; href: string }
  | { type: "code"; filename: string };

export interface ChangelogEntryView {
  text: string;
  filenames: string[];
  parts: EntryPart[];
}

export interface ChangelogGroupView {
  date: string;
  entries: ChangelogEntryView[];
}

interface ChangelogFilterProps {
  groups: ChangelogGroupView[];
}

export function ChangelogFilter({ groups }: ChangelogFilterProps) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const visible = useMemo(() => {
    return groups
      .map((group) => {
        const entries = group.entries.filter(
          (e) => !q || e.filenames.join(" ").toLowerCase().includes(q),
        );
        return { ...group, entries };
      })
      .filter((g) => g.entries.length > 0);
  }, [groups, q]);

  if (!groups.length) {
    return <p className="changelog-empty">No changelog entries found.</p>;
  }

  return (
    <>
      <div className="index-filter-bar">
        <input
          id="changelog-filter-input"
          className="index-filter-input"
          type="text"
          placeholder="Filter by filename…"
          aria-label="Filter changelog entries by filename"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div id="changelog-groups" className="changelog-groups">
        {visible.map((group) => (
          <section key={group.date} className="changelog-group">
            <h2 className="changelog-date">{group.date}</h2>
            <ul className="changelog-entry-list">
              {group.entries.map((entry, i) => (
                <li
                  key={`${group.date}-${i}`}
                  className="changelog-entry"
                  data-filenames={entry.filenames.join(" ").toLowerCase()}
                >
                  {entry.parts.map((part, j) => {
                    if (part.type === "text") return <span key={j}>{part.value}</span>;
                    if (part.type === "link") {
                      return (
                        <Link key={j} href={part.href}>
                          <code className="changelog-file-link">{part.filename}</code>
                        </Link>
                      );
                    }
                    return <code key={j}>{part.filename}</code>;
                  })}
                </li>
              ))}
            </ul>
          </section>
        ))}
        {visible.length === 0 && <p className="changelog-empty">No matching entries.</p>}
      </div>
    </>
  );
}
