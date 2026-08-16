#!/usr/bin/env python3
"""Deterministic pre-check for SD rater params U8, U9.

These params are filesystem/text facts, not LLM judgment - they must not vary
run-to-run. This script resolves them once and prints a human-readable report
the rater pastes in, instead of the model guessing whether files/links exist.

  U8 - filename is lowercase, hyphen-separated, .md.
  U9 - every relative [text](./path.md) link resolves to a real file.

Unlike DSA's title↔filename check, SD has no H1-must-slugify-to-filename rule
(sd-writer.md's U8 only requires the filename convention itself - title format
differs by type: "# [Name]" vs HLD's "# Design: [System Name]") - so this
script does not check H1 against the filename.

Usage:
  python3 sd_check.py <article.md> [<article.md> ...]

Content root is inferred as the nearest ancestor dir named "content"; relative
links resolve against the article's own directory, as the app loads them.
Pending links inside HTML comments (<!-- ... -->) are skipped - not live links.
"""

import re
import sys
from pathlib import Path

# [text](target) - capture target. Skip images ![..](..) via the negative lookbehind.
LINK_RE = re.compile(r"(?<!\!)\[[^\]]*\]\(([^)]+)\)")
HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)


def find_content_root(path: Path) -> Path | None:
    for parent in path.resolve().parents:
        if parent.name == "content":
            return parent
    return None


def check_filename(path: Path) -> tuple[bool, str]:
    name = path.name
    if not name.endswith(".md"):
        return False, f"{name}: not .md"
    stem = name[:-3]
    if stem != stem.lower():
        return False, f"{name}: not lowercase"
    if "_" in stem or " " in stem:
        return False, f"{name}: use hyphens, not underscores/spaces"
    if re.search(r"[^a-z0-9-]", stem):
        return False, f"{name}: illegal chars (only a-z, 0-9, -)"
    return True, f"{name}: ok"


def check_links(path: Path, text: str) -> tuple[bool, list[str]]:
    broken = []
    base = path.resolve().parent
    text = HTML_COMMENT_RE.sub("", text)  # pending links live in comments by convention - not live links
    for target in LINK_RE.findall(text):
        link = target.split("#", 1)[0].strip()  # drop anchors
        if not link:
            continue
        if link.startswith(("http://", "https://", "mailto:")):
            continue
        if not link.endswith(".md"):
            continue  # only verify .md cross-references
        resolved = (base / link).resolve()
        if not resolved.is_file():
            broken.append(f"{target} → missing")
    return (len(broken) == 0), broken


def report_one(path: Path) -> bool:
    lines = [f"FILE: {path}"]
    if not path.is_file():
        lines.append("  ERROR: file not found")
        print("\n".join(lines))
        return False

    text = path.read_text(encoding="utf-8")
    ok = True

    fn_ok, fn_msg = check_filename(path)
    ok &= fn_ok
    lines.append(f"  U8 filename convention   {'PASS' if fn_ok else 'FAIL'}  - {fn_msg}")

    l_ok, broken = check_links(path, text)
    ok &= l_ok
    if l_ok:
        lines.append("  U9 links resolve         PASS  - all .md links resolve")
    else:
        lines.append(f"  U9 links resolve         FAIL  - {len(broken)} broken:")
        lines.extend(f"        {b}" for b in broken)

    if find_content_root(path) is None:
        lines.append("  WARN: no 'content' ancestor - links resolved against file dir only")

    print("\n".join(lines))
    return ok


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    all_ok = True
    for arg in sys.argv[1:]:
        all_ok &= report_one(Path(arg))
        print()
    print("=" * 60)
    print(
        "RESULT: all checks PASS"
        if all_ok
        else "RESULT: failures above - fix before relying on U8/U9 as PASS"
    )
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
