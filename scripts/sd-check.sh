#!/usr/bin/env bash
# Terminal wrapper for the SD rater filesystem pre-check (U8/U9).
# Logic lives in sd_check.py; this just runs it with the right python.
#
# Usage: ./sd-check.sh <article.md> [<article.md> ...]
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$#" -lt 1 ]; then
  echo "usage: $0 <article.md> [<article.md> ...]" >&2
  exit 2
fi

py="$(command -v python3 || command -v python)"
exec "$py" "$here/sd_check.py" "$@"
