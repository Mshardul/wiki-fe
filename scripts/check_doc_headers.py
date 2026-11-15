"""Validate and refresh the front-matter header on non-code markdown docs."""

# Mirrored in wiki-fe and wiki-be (scripts/check_doc_headers.py); change both.

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

ROLES = (
    "plan",
    "spec",
    "audit-report",
    "audit-prompt",
    "instructions",
    "decision",
    "prompt",
    "reference",
)

STATUSES: dict[str, tuple[str, ...]] = {
    "plan": ("draft", "open", "in-progress", "done", "dropped"),
    "spec": ("draft", "approved", "implemented", "superseded"),
    "audit-report": ("pending", "triaged", "closed"),
    "decision": ("proposed", "accepted", "superseded"),
    "audit-prompt": ("active", "deprecated"),
    "instructions": ("active", "deprecated"),
    "prompt": ("active", "deprecated"),
    "reference": ("active", "deprecated"),
}

KEYS = ("role", "created", "last_updated", "status")

# Nearest ancestor directory name (underscores read as hyphens) decides which roles are allowed.
DIR_ROLES: dict[str, frozenset[str]] = {
    "ai-instructions": frozenset({"instructions", "reference"}),
    "audit-prompts": frozenset({"audit-prompt"}),
    "audit-reports": frozenset({"audit-report", "reference"}),
    "plans": frozenset({"plan"}),
    "specs": frozenset({"spec"}),
    "decisions": frozenset({"decision"}),
    "visualizer": frozenset({"reference", "spec", "plan", "instructions"}),
    ".prompts": frozenset({"prompt"}),
}

SCAN_ROOTS = ("docs/_meta", "docs/superpowers", ".prompts")

# Generated files that a header would not survive; matched as a path suffix.
EXCLUDED = ("docs/_meta/practice-problems-index.md",)

HEADER = re.compile(r"\A---\n(.*?)\n---(?:\n|\Z)", re.DOTALL)
FIELD = re.compile(r"^([a-z_]+): (\S.*)$")
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def is_hidden(parts: tuple[str, ...]) -> bool:
    """True when any path component is a dot-directory or dot-file."""
    return any(part.startswith(".") and part not in (".", "..") for part in parts)


def expand(paths: list[Path]) -> list[Path]:
    """Expand directories to the markdown files below them, skipping hidden directories."""
    files: list[Path] = []
    for path in paths:
        if path.is_dir():
            files.extend(
                p for p in sorted(path.rglob("*.md")) if not is_hidden(p.relative_to(path).parts)
            )
        elif path.is_file():
            files.append(path)
    return files


def is_excluded(path: Path) -> bool:
    """True for generated files that carry no header."""
    return path.as_posix().endswith(EXCLUDED)


def discover() -> list[Path]:
    """Default file set: every markdown file under the scan roots of the current repo."""
    return expand([Path(root) for root in SCAN_ROOTS])


def staged_paths() -> set[Path]:
    """Resolved paths of added/modified files in the git index; empty outside a repo."""
    argv = ["git", "diff", "--cached", "--name-only", "--relative", "--diff-filter=AM", "-z"]
    try:
        out = subprocess.run(argv, capture_output=True, check=True, text=True).stdout  # noqa: S603
    except (OSError, subprocess.CalledProcessError):
        return set()
    return {Path(name).resolve() for name in out.split("\0") if name}


def parse(text: str) -> tuple[dict[str, str], list[str]]:
    """Split the header into fields and report structural problems."""
    match = HEADER.match(text)
    if not match:
        return {}, ["missing front-matter header"]
    fields: dict[str, str] = {}
    errors: list[str] = []
    for raw in match.group(1).split("\n"):
        if not raw.strip():
            continue
        line = FIELD.match(raw)
        if not line:
            errors.append(f"unparsable header line: {raw!r}")
            continue
        key, value = line.group(1), line.group(2).strip()
        if key not in KEYS:
            errors.append(f"unknown field: {key}")
        elif key in fields:
            errors.append(f"duplicate field: {key}")
        else:
            fields[key] = value
    errors.extend(f"missing field: {key}" for key in KEYS if key not in fields)
    return fields, errors


def expected_roles(path: Path) -> frozenset[str] | None:
    """Roles allowed by the nearest mapped ancestor directory, or None when unmapped."""
    for part in reversed(path.parts[:-1]):
        key = part if part.startswith(".") else part.replace("_", "-")
        if key in DIR_ROLES:
            return DIR_ROLES[key]
    return None


def check_date(value: str) -> date | None:
    """Parse an ISO date or return None; the caller records the error."""
    if not ISO_DATE.match(value):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def validate(path: Path, fields: dict[str, str]) -> tuple[list[str], list[str]]:
    """Return (errors, warnings) for a structurally valid header."""
    errors: list[str] = []
    warnings: list[str] = []
    role, status = fields["role"], fields["status"]
    if role not in ROLES:
        errors.append(f"role {role!r} not in {', '.join(ROLES)}")
    elif status not in STATUSES[role]:
        errors.append(f"status {status!r} invalid for role {role}; use {', '.join(STATUSES[role])}")
    created = check_date(fields["created"])
    updated = check_date(fields["last_updated"])
    if created is None:
        errors.append(f"created {fields['created']!r} is not an ISO date (YYYY-MM-DD)")
    if updated is None:
        errors.append(f"last_updated {fields['last_updated']!r} is not an ISO date (YYYY-MM-DD)")
    if created and updated and updated < created:
        errors.append("last_updated is earlier than created")
    allowed = expected_roles(path)
    if allowed is None:
        warnings.append("directory has no role mapping; role not cross-checked")
    elif role in ROLES and role not in allowed:
        errors.append(
            f"role {role!r} does not fit this directory (expected {', '.join(sorted(allowed))})"
        )
    return errors, warnings


def bump(path: Path, text: str, today: str) -> None:
    """Rewrite last_updated inside the header only."""
    match = HEADER.match(text)
    if match is None:
        return
    head = re.sub(r"(?m)^last_updated: .*$", f"last_updated: {today}", match.group(0))
    path.write_text(head + text[match.end() :], encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    """Check every target file; with --fix, bump last_updated on staged files."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "paths", nargs="*", type=Path, help="files or directories (default: repo docs)"
    )
    parser.add_argument(
        "--fix", action="store_true", help="set last_updated to today on staged files"
    )
    args = parser.parse_args(argv)

    files = [p for p in (expand(args.paths) if args.paths else discover()) if not is_excluded(p)]
    staged = staged_paths()
    today = date.today().isoformat()
    failed = False

    for path in files:
        text = path.read_text(encoding="utf-8")
        fields, errors = parse(text)
        warnings: list[str] = []
        if not errors:
            errors, warnings = validate(path, fields)
        if not errors and path.resolve() in staged and fields["last_updated"] != today:
            if args.fix:
                bump(path, text, today)
                print(f"fixed: {path}: last_updated {fields['last_updated']} -> {today}")
            else:
                errors.append(
                    f"staged change but last_updated is {fields['last_updated']}, expected {today}"
                )
        for warning in warnings:
            print(f"warning: {path}: {warning}", file=sys.stderr)
        for error in errors:
            print(f"{path}: {error}")
        failed = failed or bool(errors)

    if failed:
        print("\nDoc header check failed. Stale last_updated on staged files: run with --fix.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
