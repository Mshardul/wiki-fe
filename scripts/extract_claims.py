#!/usr/bin/env python3
"""Pre-seed a folder's V9 claims cache with mechanically-extractable numeric/table claims (see sd-rater.md's V9 claims cache)."""
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

NUMERIC_RE = re.compile(
    r"(<|>|~|≥|≤)?\s*\d+(?:\.\d+)?\s*(?:[–-]\s*\d+(?:\.\d+)?)?\s*"
    r"(?:ms|µs|us|ns|s|min|hr|GB|MB|TB|KB|Kbps|Mbps|Gbps|QPS|RPS|rps|qps|"
    r"ops/sec|req/s|reqs/sec|%|nodes|shards|replicas|partitions)\b",
    re.IGNORECASE,
)
BIGO_RE = re.compile(r"O\([^)]{1,20}\)")
TABLE_HEADER_RE = re.compile(r"^\|.+\|\s*$")
TABLE_SEP_RE = re.compile(r"^\|[\s:|-]+\|\s*$")
HEADING_RE = re.compile(r"^#{1,3}\s+(.+)$")


def extract_numeric_claims(lines):
    claims = []
    for i, line in enumerate(lines, start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith("```"):
            continue
        found = set(m.group(0).strip() for m in NUMERIC_RE.finditer(line))
        found |= set(m.group(0) for m in BIGO_RE.finditer(line))
        if found:
            claims.append(f"L{i}: {stripped}")
    return claims


def extract_tables(lines):
    tables = []
    current_heading = None
    i = 0
    n = len(lines)
    while i < n:
        h = HEADING_RE.match(lines[i])
        if h:
            current_heading = h.group(1).strip()
            i += 1
            continue
        if (
            TABLE_HEADER_RE.match(lines[i])
            and i + 1 < n
            and TABLE_SEP_RE.match(lines[i + 1])
        ):
            start = i
            j = i + 2
            while j < n and TABLE_HEADER_RE.match(lines[j]):
                j += 1
            heading_label = current_heading or "(no heading)"
            tables.append(f"{heading_label} (L{start + 1}-{j}): " + " / ".join(
                l.strip() for l in lines[start:j]
            ))
            i = j
            continue
        i += 1
    return tables


def file_mtime_iso(path: Path) -> str:
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()


def extract_one(path: Path):
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    return {
        "mtime": file_mtime_iso(path),
        "claims": {
            "definitions": [],
            "numeric": extract_numeric_claims(lines),
            "comparison_rows": extract_tables(lines),
            "terminology": [],
        },
    }


def main():
    if len(sys.argv) != 2:
        print("usage: extract_claims.py <content/system-design/<folder>>", file=sys.stderr)
        sys.exit(1)

    folder = Path(sys.argv[1])
    if not folder.is_dir():
        print(f"not a directory: {folder}", file=sys.stderr)
        sys.exit(1)

    cache_path = folder / ".v9-cache.json"
    existing = {}
    if cache_path.exists():
        existing = json.loads(cache_path.read_text(encoding="utf-8"))

    md_files = sorted(folder.glob("*.md"))
    updated = 0
    for path in md_files:
        name = path.name
        fresh = extract_one(path)
        prev = existing.get(name)
        if prev and prev.get("mtime") == fresh["mtime"]:
            # unchanged since last extraction/rating - keep whatever's there (may carry LLM-filled definitions/terminology)
            continue
        if prev:
            # file changed: refresh mechanical fields, keep any prior LLM-filled semantic fields as stale-but-present
            # (rater will overwrite definitions/terminology on next full rate of this file)
            fresh["claims"]["definitions"] = prev.get("claims", {}).get("definitions", [])
            fresh["claims"]["terminology"] = prev.get("claims", {}).get("terminology", [])
        existing[name] = fresh
        updated += 1

    cache_path.write_text(json.dumps(existing, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{folder}: {updated} file(s) (re)extracted, {len(existing)} total cached, wrote {cache_path}")


if __name__ == "__main__":
    main()
