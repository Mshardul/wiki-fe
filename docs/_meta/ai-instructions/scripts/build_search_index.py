#!/usr/bin/env python3
"""Generate content/search-index.json from each wiki's index.md.

Mirrors the parsing rules of parseIndexMd (js/render/home-index.js) so the
FE can load one static JSON file instead of fetching + parsing every wiki's
index.md on first ⌘K open. Run in CI before deploy; commit the output.

Usage:
  python3 build_search_index.py
"""

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
CONTENT_ROOT = REPO_ROOT / "content"

# Keep in sync with WIKIS in js/state.js.
WIKIS = [
    {"id": "system-design", "title": "System Design", "indexPath": "system-design/index.md"},
    {"id": "dsa", "title": "Data Structures & Algorithms", "indexPath": "dsa/index.md"},
]

SKIP_HEADINGS = ("how to use", "contributing")
ROW_RE = re.compile(r"^\|\s*\[([^\]]+)\]\(([^)]+\.md)\)\s*\|\s*([^|]+?)\s*\|")


def parse_index_md(markdown: str, base_path: str) -> list[dict]:
    sections = []
    normalized = markdown.replace("\r\n", "\n")
    chunks = re.split(r"\n(?=## )", normalized)

    for chunk in chunks:
        lines = chunk.split("\n")
        first_line = lines[0]
        if not first_line.startswith("## "):
            continue

        heading = first_line[3:].strip()
        if any(skip in heading.lower() for skip in SKIP_HEADINGS):
            continue

        cards = []
        for line in lines:
            if not line.startswith("|"):
                continue
            if re.match(r"^\|\s*[-:]+", line):
                continue

            m = ROW_RE.match(line)
            if not m:
                continue

            title, rel_path, description = m.group(1).strip(), m.group(2).strip(), m.group(3).strip()
            full_path = f"{base_path}/{rel_path.removeprefix('./')}"
            slug = rel_path.split("/")[-1].removesuffix(".md")
            cards.append({"title": title, "path": full_path, "slug": slug, "description": description})

        if cards:
            sections.append({"heading": heading, "cards": cards})

    return sections


def main() -> int:
    index = {}
    for wiki in WIKIS:
        index_file = CONTENT_ROOT / wiki["indexPath"]
        if not index_file.exists():
            print(f"error: missing index file for wiki '{wiki['id']}': {index_file}", file=sys.stderr)
            return 1
        markdown = index_file.read_text(encoding="utf-8")
        base_path = f"./content/{wiki['id']}"
        index[wiki["id"]] = parse_index_md(markdown, base_path)

    out_path = CONTENT_ROOT / "search-index.json"
    out_path.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
