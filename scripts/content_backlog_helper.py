#!/usr/bin/env python3
"""Helper queries for .prompts/fe-write-content.md - avoids full-file reads for mechanical lookups."""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKLOG = ROOT / "docs" / "content-backlog.md"
ARCHIVE = ROOT / "docs" / "content-archive.md"
CONTENT = ROOT / "content"

ROW_RE = re.compile(r"^\|\s*((?:DSA|SD)-\d+)\s*\|(.*)\|\s*$")
ID_RE = re.compile(r"\b(DSA|SD)-(\d+)\b")
PENDING_LINK_RE = re.compile(r"<!--\s*\[([^\]]+)\]\(([^)]+\.md)\)\s*\[(Must read|Should read)\](?:[^-]|-(?!-))*-->")


def parse_rows(path):
    rows = []
    for line in path.read_text().splitlines():
        m = ROW_RE.match(line)
        if m:
            rows.append((m.group(1), line))
    return rows


def cmd_active():
    """Print only Backlog-status rows from content-backlog.md."""
    for rid, line in parse_rows(BACKLOG):
        cols = [c.strip() for c in line.strip("|").split("|")]
        if cols[6] == "Backlog":  # Status column
            print(line)


def cmd_next_id(prefix):
    """Print next sequential ID for a prefix (DSA/SD), unique across backlog+archive."""
    if prefix not in ("DSA", "SD"):
        sys.exit("prefix must be DSA or SD")
    max_n = 0
    for path in (BACKLOG, ARCHIVE):
        for m in ID_RE.finditer(path.read_text()):
            if m.group(1) == prefix:
                max_n = max(max_n, int(m.group(2)))
    print(f"{prefix}-{max_n + 1:03d}")


def cmd_deferred_section(vertical):
    """Print the '## Deferred / Not yet filed' section from a vertical's index.md."""
    path = CONTENT / vertical / "index.md"
    if not path.exists():
        sys.exit(f"no index.md for vertical: {vertical}")
    lines = path.read_text().splitlines()
    start = next((i for i, l in enumerate(lines) if l.strip() == "## Deferred / Not yet filed"), None)
    if start is None:
        return
    for line in lines[start + 1:]:
        if line.startswith("## ") or line.strip() == "---":
            break
        if line.strip():
            print(line)


def cmd_hinted_gaps():
    """Grep every article for pending-link HTML comments pointing at not-yet-written pages."""
    for md in CONTENT.rglob("*.md"):
        text = md.read_text(errors="ignore")
        for m in PENDING_LINK_RE.finditer(text):
            title, target, tier = m.groups()
            target_path = (md.parent / target).resolve()
            if not target_path.exists():
                rel = md.relative_to(CONTENT)
                print(f"{rel}: [{title}]({target}) [{tier}]")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: content_backlog_helper.py {active|next-id <DSA|SD>|hinted-gaps|deferred-section <vertical>}")
    cmd = sys.argv[1]
    if cmd == "active":
        cmd_active()
    elif cmd == "next-id":
        cmd_next_id(sys.argv[2])
    elif cmd == "hinted-gaps":
        cmd_hinted_gaps()
    elif cmd == "deferred-section":
        cmd_deferred_section(sys.argv[2])
    else:
        sys.exit(f"unknown command: {cmd}")
