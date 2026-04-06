#!/usr/bin/env bash
# Fetch current flood warnings from EA API
set -euo pipefail

API="https://environment.data.gov.uk/flood-monitoring"
OUT="assets/data/water-quality/flood-warnings.json"

echo "Fetching flood warnings..."
curl -sf "${API}/id/floods" > /tmp/ea-floods-raw.json

python3 - /tmp/ea-floods-raw.json "$OUT" << 'PYEOF'
import json, sys

with open(sys.argv[1]) as f:
    data = json.load(f)

warnings = []
for w in data.get("items", []):
    severity = w.get("severityLevel")
    if not severity or severity > 3:
        continue
    area = w.get("floodArea", {})
    warnings.append({
        "id": w.get("floodAreaID", ""),
        "severity": severity,
        "severityLabel": w.get("severity", ""),
        "area": area.get("label", ""),
        "areaId": area.get("notation", ""),
        "county": area.get("county", ""),
        "message": w.get("message", ""),
        "timeRaised": w.get("timeRaised", ""),
        "timeSeverityChanged": w.get("timeSeverityChanged", ""),
        "timeMessageChanged": w.get("timeMessageChanged", "")
    })

with open(sys.argv[2], "w") as f:
    json.dump({"warnings": warnings}, f, indent=2)

print(f"Wrote {len(warnings)} flood warnings")
PYEOF
