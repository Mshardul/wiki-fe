#!/usr/bin/env python3
"""Generate content/broken-links.json - internal .md links pointing at a non-existent page.

Reuses the same scan/resolve logic as build_backlinks.py, but instead of dropping
link targets that aren't in the article registry, records them as broken. Run
after build_search_index.py (reads its output); commit the result.

Usage:
  python3 build_broken_links.py
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

    broken: dict[str, list[dict]] = {}
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
            if target_key in articles:
                continue
            seen_targets.add(target)
            broken.setdefault(path, []).append({"title": title, "target": target_key})

    out_path = CONTENT_ROOT / "broken-links.json"
    out_path.write_text(json.dumps(broken, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    total = sum(len(v) for v in broken.values())
    print(f"wrote {out_path} ({total} broken links across {len(broken)} articles)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
