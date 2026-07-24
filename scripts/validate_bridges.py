#!/usr/bin/env python3
"""Validate content/bridges.json against its schema.

bridges.json is hand-authored (unlike search-index/backlinks/broken-links,
which are generated) - a flat list of { a, b } cross-wiki concept-link pairs.
Catches shape drift from manual edits before it reaches related-articles.js.

Usage:
  python3 validate_bridges.py
"""

import json
import sys
from pathlib import Path

import jsonschema

REPO_ROOT = Path(__file__).resolve().parents[1]
BRIDGES_FILE = REPO_ROOT / "content" / "bridges.json"

SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "a": {"type": "string", "pattern": r"^\./content/.+\.md$"},
            "b": {"type": "string", "pattern": r"^\./content/.+\.md$"},
        },
        "required": ["a", "b"],
        "additionalProperties": False,
    },
}


def main() -> int:
    data = json.loads(BRIDGES_FILE.read_text(encoding="utf-8"))
    try:
        jsonschema.validate(data, SCHEMA)
    except jsonschema.ValidationError as e:
        print(f"error: {BRIDGES_FILE} failed schema validation: {e.message}", file=sys.stderr)
        print(f"  at: {' -> '.join(str(p) for p in e.absolute_path) or '(root)'}", file=sys.stderr)
        return 1

    for i, pair in enumerate(data):
        for side in ("a", "b"):
            if not (REPO_ROOT / pair[side].removeprefix("./")).exists():
                print(f"error: {BRIDGES_FILE}[{i}].{side} points at nonexistent file: {pair[side]}", file=sys.stderr)
                return 1
        if pair["a"] == pair["b"]:
            print(f"error: {BRIDGES_FILE}[{i}] links an article to itself: {pair['a']}", file=sys.stderr)
            return 1

    print(f"{BRIDGES_FILE}: {len(data)} bridges valid")
    return 0


if __name__ == "__main__":
    sys.exit(main())
