#!/usr/bin/env bash
# Archive today's readings as a daily snapshot
set -euo pipefail

SRC="assets/data/water-quality/latest-readings.json"
DEST="assets/data/water-quality/history"
DATE=$(date -u +%Y-%m-%d)

if [ -f "$SRC" ]; then
  cp "$SRC" "${DEST}/readings-${DATE}.json"
  echo "Archived readings to ${DEST}/readings-${DATE}.json"
else
  echo "No readings to archive"
fi
