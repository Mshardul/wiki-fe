#!/usr/bin/env python3
"""Bump wiki-sw.js's ARTICLE_CACHE version when content/ changes.

Hashes every content/**/*.md file (sorted, path + bytes), and rewrites
ARTICLE_CACHE's version suffix in wiki-sw.js to the first 8 hex chars of that
hash. No-op if the hash already matches - keeps unrelated commits from
touching wiki-sw.js. Run before commit; pre-commit hook wires this in.

Usage:
  python3 bump_cache_version.py
"""

import hashlib
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
CONTENT_ROOT = REPO_ROOT / "content"
SW_FILE = REPO_ROOT / "wiki-sw.js"

ARTICLE_CACHE_RE = re.compile(r'(const ARTICLE_CACHE = "wiki-articles-v)([0-9a-f]+)(";)')


def content_hash() -> str:
    h = hashlib.sha256()
    for path in sorted(CONTENT_ROOT.rglob("*.md")):
        h.update(str(path.relative_to(CONTENT_ROOT)).encode("utf-8"))
        h.update(path.read_bytes())
    return h.hexdigest()[:8]


def main() -> int:
    sw_text = SW_FILE.read_text(encoding="utf-8")
    match = ARTICLE_CACHE_RE.search(sw_text)
    if not match:
        print(f"error: ARTICLE_CACHE version string not found in {SW_FILE}", file=sys.stderr)
        return 1

    new_version = content_hash()
    if match.group(2) == new_version:
        print(f"ARTICLE_CACHE already at v{new_version} - no change")
        return 0

    SW_FILE.write_text(
        ARTICLE_CACHE_RE.sub(rf"\g<1>{new_version}\g<3>", sw_text, count=1),
        encoding="utf-8",
    )
    print(f"ARTICLE_CACHE bumped: v{match.group(2)} -> v{new_version}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
