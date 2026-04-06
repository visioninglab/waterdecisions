#!/usr/bin/env bash
# Fetch latest readings for all stations in stations.json
set -euo pipefail

API="https://environment.data.gov.uk/flood-monitoring"
STATIONS="assets/data/water-quality/stations.json"
OUT="assets/data/water-quality/latest-readings.json"

if [ ! -f "$STATIONS" ]; then
  echo "No stations.json — run fetch-stations.sh first"
  exit 1
fi

python3 - "$API" "$STATIONS" "$OUT" << 'PYEOF'
import json, sys
from urllib.request import urlopen
from datetime import datetime, timezone

api, stations_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
now = datetime.now(timezone.utc).isoformat()

with open(stations_path) as f:
    station_ids = [s["id"] for s in json.load(f).get("stations", [])]

readings = []
for i, sid in enumerate(station_ids):
    try:
        data = json.loads(urlopen(f"{api}/id/stations/{sid}/readings?latest", timeout=10).read())
        for r in data.get("items", []):
            mid = str(r.get("measure", "")).split("/")[-1]
            readings.append({
                "stationId": sid, "measure": mid,
                "value": r.get("value"), "dateTime": r.get("dateTime", "")
            })
    except Exception:
        pass
    if (i + 1) % 50 == 0:
        print(f"  {i+1}/{len(station_ids)} stations...")

with open(out_path, "w") as f:
    json.dump({"readings": readings, "meta": {
        "fetched": now, "count": len(readings), "source": "EA Flood Monitoring API"
    }}, f, indent=2)

print(f"Wrote {len(readings)} readings")
PYEOF
