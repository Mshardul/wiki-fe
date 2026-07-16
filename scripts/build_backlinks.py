#!/usr/bin/env python3
"""Generate content/backlinks.json - the "mentioned by" reverse-link map.

For every article listed in content/search-index.json, scans its raw markdown
for internal .md links, resolves them relative to the article's own directory
(mirroring resolvePath in js/render/nav-utils.js), and inverts the result into
target_path -> [{title, path} of every article that links to it].

Run after build_search_index.py (reads its output); commit the result.

Usage:
  python3 build_backlinks.py
"""

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
CONTENT_ROOT = REPO_ROOT / "content"

LINK_RE = re.compile(r"\[[^\]]*\]\(([^)]+\.md)(?:#[^)]*)?\)")


def resolve_path(base_dir: str, rel_href: str) -> str:
    stack = [p for p in base_dir.split("/") if p]
    for part in rel_href.split("/"):
        if part == "..":
            if stack:
                stack.pop()
        elif part and part != ".":
            stack.append(part)
    return "/".join(stack)


def main() -> int:
    index_file = CONTENT_ROOT / "search-index.json"
    if not index_file.exists():
        print(f"error: missing {index_file} - run build_search_index.py first", file=sys.stderr)
        return 1
    index = json.loads(index_file.read_text(encoding="utf-8"))

    # path -> title, for every article across every wiki.
    articles: dict[str, str] = {}
    for sections in index.values():
        for section in sections:
            for card in section["cards"]:
                articles[card["path"]] = card["title"]

    backlinks: dict[str, list[dict]] = {}
    for path, title in articles.items():
        fs_path = REPO_ROOT / path.removeprefix("./")
        if not fs_path.exists():
            continue
        markdown = fs_path.read_text(encoding="utf-8")
        base_dir = str(Path(path).parent)

        seen_targets = set()
        for m in LINK_RE.finditer(markdown):
            target = resolve_path(base_dir, m.group(1))
            if target == path.removeprefix("./") or target in seen_targets:
                continue
            target_key = f"./{target}"
            if target_key not in articles:
                continue
            seen_targets.add(target)
            backlinks.setdefault(target_key, []).append({"title": title, "path": path})

    out_path = CONTENT_ROOT / "backlinks.json"
    out_path.write_text(json.dumps(backlinks, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    print(f"wrote {out_path} ({len(backlinks)} articles with incoming links)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
