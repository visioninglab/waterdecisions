#!/usr/bin/env bash
# Fetch active stations for North England catchments from the EA Flood Monitoring API
set -euo pipefail

API="https://environment.data.gov.uk/flood-monitoring"
OUT="assets/data/water-quality/stations.json"
CATCHMENTS=("Tyne" "Wear" "Tees" "Swale" "Wharfe%20and%20Lower%20Ouse" "Aire%20and%20Calder" "Don%20and%20Rother" "Derwent" "Rother")

echo '{"stations":[],"meta":{}}' > "$OUT.tmp"

for c in "${CATCHMENTS[@]}"; do
  echo "Fetching stations for $c..."
  curl -sf "${API}/id/stations?catchmentName=${c}&status=Active&_limit=500" > "/tmp/ea-stations-${c}.json" || continue
done

python3 - "$OUT" "${CATCHMENTS[@]}" << 'PYEOF'
import json, sys, glob
from datetime import datetime, timezone

out_path = sys.argv[1]
catchments = sys.argv[2:]
now = datetime.now(timezone.utc).isoformat()
all_stations = []
seen = set()

for c in catchments:
    path = f"/tmp/ea-stations-{c}.json"
    try:
        with open(path) as f:
            data = json.load(f)
    except Exception:
        continue
    for s in data.get("items", []):
        sid = s.get("notation") or s.get("stationReference") or ""
        if sid in seen or not s.get("lat") or not s.get("long"):
            continue
        seen.add(sid)
        measures_raw = s.get("measures", [])
        if not isinstance(measures_raw, list):
            measures_raw = [measures_raw] if measures_raw else []
        all_stations.append({
            "id": sid,
            "label": s.get("label", ""),
            "river": s.get("riverName", ""),
            "catchment": s.get("catchmentName", ""),
            "town": s.get("town", ""),
            "lat": s.get("lat"),
            "lng": s.get("long"),
            "type": str(s.get("type", "")).split("/")[-1] or "Unknown",
            "dateOpened": s.get("dateOpened", ""),
            "measures": [{
                "id": str(m.get("notation") or m.get("@id", "")).split("/")[-1],
                "parameter": m.get("parameter", ""),
                "parameterName": m.get("parameterName", ""),
                "qualifier": m.get("qualifier", ""),
                "unit": m.get("unitName", ""),
                "period": m.get("period")
            } for m in measures_raw]
        })

with open(out_path, "w") as f:
    json.dump({"stations": all_stations, "meta": {
        "fetched": now, "count": len(all_stations),
        "source": "EA Flood Monitoring API", "region": "North England"
    }}, f, indent=2)

print(f"Wrote {len(all_stations)} stations")
PYEOF
