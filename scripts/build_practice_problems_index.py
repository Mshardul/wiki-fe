#!/usr/bin/env python3
"""Generate docs/_meta/practice-problems-index.md - the source-of-truth list of
every Practice Problems entry (and its Duplicate problems citations) across all
DSA articles, read directly from the content .md files.

Unlike the hand-maintained docs/_meta/plans/dsa-worked-problems-dedup*-inventory.md
files, this is fully derived: it does not track distinct-technique judgment calls
or authoring notes, only what each article's `## Practice problems` section
actually contains right now. Re-run after any Practice Problems edit; safe to
run any time, always overwrites the same file.

Usage:
  python3 build_practice_problems_index.py
"""

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
CONTENT_ROOT = REPO_ROOT / "content" / "dsa"
OUT_PATH = REPO_ROOT / "docs" / "_meta" / "practice-problems-index.md"

TYPES = [
    ("Patterns", "patterns"),
    ("Data Structures", "data-structures"),
    ("Algorithms", "algorithms"),
]

ENTRY_RE = re.compile(r"^### (\d+)\.\s+(.+)$")
DUP_HEADER_RE = re.compile(r"^\*\*Duplicate problems:\*\*\s*(.*)$")
BULLET_RE = re.compile(r"^-\s+(.+)$")


def extract_entries(markdown: str) -> list[dict] | None:
    """Return None if the file has no Practice problems section (out of scope)."""
    marker = "## Practice problems"
    idx = markdown.find(marker)
    if idx == -1:
        return None
    section = markdown[idx:]
    lines = section.splitlines()

    entries: list[dict] = []
    current: dict | None = None
    in_dup_block = False

    for line in lines:
        m = ENTRY_RE.match(line)
        if m:
            current = {"title": m.group(2).strip(), "dups": []}
            entries.append(current)
            in_dup_block = False
            continue

        dup_m = DUP_HEADER_RE.match(line)
        if dup_m:
            in_dup_block = True
            inline = dup_m.group(1).strip()
            if inline and current is not None:
                current["dups"].append(inline)
            continue

        if line.startswith("### ") or line.startswith("## "):
            in_dup_block = False
            continue

        if in_dup_block:
            b = BULLET_RE.match(line)
            if b and current is not None:
                current["dups"].append(b.group(1).strip())
            elif line.strip() == "":
                continue
            else:
                in_dup_block = False

    return entries


def format_dup(raw: str) -> str:
    """Trim a duplicate-problems bullet/inline citation down to its title, dropping
    trailing reasoning prose after the first ' - ' that occurs outside parentheses
    (titles sometimes carry a parenthetical, e.g. "Foo (LC 1) - reason - more reason",
    or "Bar (a related but distinct problem - needs X)" where the dash is inside)."""
    text = raw.strip().strip('"')
    depth = 0
    for m in re.finditer(r"\(|\)|\s-\s", text):
        tok = m.group()
        if tok == "(":
            depth += 1
        elif tok == ")":
            depth -= 1
        elif depth == 0:
            return text[: m.start()].strip()
    return text.strip()


def render_file_section(rel_path: str, entries: list[dict]) -> str:
    lines = [f"## `{rel_path}`", ""]
    if not entries:
        lines.append("_(stub - no Practice problems entries yet)_")
        lines.append("")
        return "\n".join(lines)
    for e in entries:
        lines.append(f"- {e['title']}")
        for d in e["dups"]:
            title = format_dup(d)
            if not title or title.lower().startswith("none"):
                continue
            lines.append(f"  - {title}")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    out_sections = [
        "# DSA Practice Problems Index",
        "",
        "Generated file - do not hand-edit. Regenerate with `python3 scripts/build_practice_problems_index.py`.",
        "",
        "Source of truth for what each article's `## Practice problems` section actually contains: entry titles and their `**Duplicate problems:**` citations, read directly from `content/dsa/`. Reasoning prose is dropped from duplicate citations, keeping only the problem title.",
        "",
    ]

    total_files = 0
    total_entries = 0

    for label, dirname in TYPES:
        type_dir = CONTENT_ROOT / dirname
        if not type_dir.is_dir():
            continue
        out_sections.append(f"# {label}")
        out_sections.append("")

        md_files = sorted(type_dir.glob("*.md"))
        for f in md_files:
            markdown = f.read_text(encoding="utf-8")
            entries = extract_entries(markdown)
            if entries is None:
                continue  # no Practice problems section - out of scope (overview/index pages)
            rel_path = f"content/dsa/{dirname}/{f.name}"
            out_sections.append(render_file_section(rel_path, entries))
            total_files += 1
            total_entries += len(entries)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text("\n".join(out_sections).rstrip() + "\n", encoding="utf-8")
    print(f"wrote {OUT_PATH} ({total_files} files, {total_entries} entries)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
