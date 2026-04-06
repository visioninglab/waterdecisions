#!/usr/bin/env bash
# Update data-meta.json with current counts and timestamp
set -euo pipefail

OUT="assets/data/water-quality/data-meta.json"
FETCH_TYPE="${1:-all}"

python3 - "$OUT" "$FETCH_TYPE" << 'PYEOF'
import json, sys, os
from datetime import datetime, timezone

out_path, fetch_type = sys.argv[1], sys.argv[2]
now = datetime.now(timezone.utc).isoformat()
base = os.path.dirname(out_path)

def count_items(path, key):
    try:
        with open(path) as f:
            return len(json.load(f).get(key, []))
    except Exception:
        return 0

with open(out_path, "w") as f:
    json.dump({
        "lastFetch": now,
        "fetchType": fetch_type,
        "stationCount": count_items(os.path.join(base, "stations.json"), "stations"),
        "readingCount": count_items(os.path.join(base, "latest-readings.json"), "readings"),
        "warningCount": count_items(os.path.join(base, "flood-warnings.json"), "warnings"),
        "region": "North England",
        "apiVersion": "0.9",
        "source": "EA Flood Monitoring API",
        "licence": "Open Government Licence v3.0"
    }, f, indent=2)

print(f"Updated meta ({fetch_type})")
PYEOF
