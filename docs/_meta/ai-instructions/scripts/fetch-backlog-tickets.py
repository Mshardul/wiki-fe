#!/usr/bin/env python3
"""Print all Backlog tickets from docs/tickets.md, sorted by priority then story points."""

import re
import sys
from pathlib import Path

TICKETS_FILE = Path(__file__).parents[3] / "tickets.md"

PRIORITY_ORDER = {"p0": 0, "p1": 1, "p2": 2, "p3": 3, "p4": 4}


def parse_row(line: str) -> dict | None:
    line = line.strip()
    if not line.startswith("|") or line.startswith("| ---") or line.startswith("| ID"):
        return None

    inner = line.strip("|")
    cols = [c.strip().replace("\\|", "|") for c in re.split(r"(?<!\\)\|", inner)]
    if len(cols) < 10:
        return None

    ticket_id, entry_date, summary, type_, component, description, status, impl_date, remarks, priority, *rest = cols
    story_points = rest[0] if rest else "0"

    return {
        "id": ticket_id,
        "entry_date": entry_date,
        "summary": summary,
        "type": type_,
        "component": component,
        "description": description,
        "status": status,
        "impl_date": impl_date,
        "remarks": remarks,
        "priority": priority,
        "story_points": story_points,
    }


def main():
    if not TICKETS_FILE.exists():
        print(f"Error: {TICKETS_FILE} not found", file=sys.stderr)
        sys.exit(1)

    rows = []
    for line in TICKETS_FILE.read_text(encoding="utf-8").splitlines():
        row = parse_row(line)
        if row and row["status"].lower() == "backlog":
            rows.append(row)

    rows.sort(key=lambda r: (
        PRIORITY_ORDER.get(r["priority"].lower(), 99),
        int(re.sub(r"\D", "", r["story_points"]) or "0"),
    ))

    if not rows:
        print("No backlog tickets found.")
        return

    headers = ["ID", "Entry Date", "Summary", "Type", "Component", "Description", "Status", "Impl. Date", "Remarks", "Priority", "Story Points"]
    print("| " + " | ".join(headers) + " |")
    print("| " + " | ".join("---" for _ in headers) + " |")
    for r in rows:
        cols = [
            r["id"], r["entry_date"], r["summary"], r["type"], r["component"],
            r["description"], r["status"], r["impl_date"], r["remarks"],
            r["priority"], r["story_points"],
        ]
        print("| " + " | ".join(cols) + " |")

    print(f"\nTotal: {len(rows)} backlog tickets")


if __name__ == "__main__":
    main()
