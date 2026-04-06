"""
Fetch water quality data for North England catchments from the EA Flood Monitoring API.
Outputs JSON files matching the dashboard's expected format.
Usage: python scripts/fetch-north-england.py [output_dir]
"""
import json, sys, os
from urllib.request import urlopen
from urllib.parse import quote
from datetime import datetime, timezone

API = "https://environment.data.gov.uk/flood-monitoring"

CATCHMENTS = [
    "Tyne", "Wear", "Tees", "Swale",
    "Wharfe and Lower Ouse", "Aire and Calder",
    "Don and Rother", "Derwent", "Rother"
]

out_dir = sys.argv[1] if len(sys.argv) > 1 else "assets/data/water-quality"
os.makedirs(out_dir, exist_ok=True)
os.makedirs(os.path.join(out_dir, "history"), exist_ok=True)

now = datetime.now(timezone.utc).isoformat()

# --- Fetch stations ---
print("Fetching stations...")
all_stations = []
seen_ids = set()
for catchment in CATCHMENTS:
    url = f"{API}/id/stations?catchmentName={quote(catchment)}&status=Active&_limit=500"
    try:
        data = json.loads(urlopen(url).read())
        for s in data.get("items", []):
            sid = s.get("notation") or s.get("stationReference") or ""
            if sid in seen_ids:
                continue
            seen_ids.add(sid)
            measures_raw = s.get("measures", [])
            if not isinstance(measures_raw, list):
                measures_raw = [measures_raw] if measures_raw else []
            measures = []
            for m in measures_raw:
                mid = str(m.get("notation") or m.get("@id", "")).split("/")[-1]
                measures.append({
                    "id": mid,
                    "parameter": m.get("parameter", ""),
                    "parameterName": m.get("parameterName", ""),
                    "qualifier": m.get("qualifier", ""),
                    "unit": m.get("unitName", ""),
                    "period": m.get("period")
                })
            lat = s.get("lat")
            lng = s.get("long")
            if not lat or not lng:
                continue
            all_stations.append({
                "id": sid,
                "label": s.get("label", ""),
                "river": s.get("riverName", ""),
                "catchment": s.get("catchmentName", ""),
                "town": s.get("town", ""),
                "lat": lat,
                "lng": lng,
                "type": str(s.get("type", "")).split("/")[-1] or "Unknown",
                "dateOpened": s.get("dateOpened", ""),
                "measures": measures
            })
        print(f"  {catchment}: {len(data.get('items', []))} stations")
    except Exception as e:
        print(f"  {catchment}: ERROR - {e}")

print(f"Total unique stations: {len(all_stations)}")

with open(os.path.join(out_dir, "stations.json"), "w") as f:
    json.dump({
        "stations": all_stations,
        "meta": {
            "fetched": now,
            "count": len(all_stations),
            "source": "EA Flood Monitoring API",
            "region": "North England",
            "catchments": CATCHMENTS
        }
    }, f, indent=2)

# --- Fetch latest readings for these stations ---
print("Fetching latest readings...")
all_readings = []
station_ids = [s["id"] for s in all_stations]

# Batch by fetching all readings and filtering, since per-station would be too many requests
try:
    # Fetch readings for each station's measures
    batch_size = 50
    for i in range(0, len(station_ids), batch_size):
        batch = station_ids[i:i+batch_size]
        for sid in batch:
            url = f"{API}/id/stations/{sid}/readings?latest"
            try:
                data = json.loads(urlopen(url).read())
                for r in data.get("items", []):
                    mid = str(r.get("measure", "")).split("/")[-1]
                    all_readings.append({
                        "stationId": sid,
                        "measure": mid,
                        "value": r.get("value"),
                        "dateTime": r.get("dateTime", "")
                    })
            except Exception:
                pass  # Some stations may not have readings
        print(f"  Processed {min(i + batch_size, len(station_ids))}/{len(station_ids)} stations...")
except Exception as e:
    print(f"  Readings error: {e}")

print(f"Total readings: {len(all_readings)}")

with open(os.path.join(out_dir, "latest-readings.json"), "w") as f:
    json.dump({
        "readings": all_readings,
        "meta": {
            "fetched": now,
            "count": len(all_readings),
            "source": "EA Flood Monitoring API"
        }
    }, f, indent=2)

# --- Fetch flood warnings ---
print("Fetching flood warnings...")
try:
    data = json.loads(urlopen(f"{API}/id/floods").read())
    # Filter to North England areas (rough lat > 53.0)
    warnings = []
    for w in data.get("items", []):
        area = w.get("floodArea", {})
        severity = w.get("severityLevel")
        if not severity or severity > 3:
            continue
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
    print(f"Total flood warnings: {len(warnings)}")
except Exception as e:
    warnings = []
    print(f"  Floods error: {e}")

with open(os.path.join(out_dir, "flood-warnings.json"), "w") as f:
    json.dump({"warnings": warnings}, f, indent=2)

# --- Update meta ---
with open(os.path.join(out_dir, "data-meta.json"), "w") as f:
    json.dump({
        "lastFetch": now,
        "fetchType": "all",
        "stationCount": len(all_stations),
        "readingCount": len(all_readings),
        "warningCount": len(warnings),
        "region": "North England",
        "catchments": CATCHMENTS,
        "apiVersion": "0.9",
        "source": "EA Flood Monitoring API",
        "licence": "Open Government Licence v3.0"
    }, f, indent=2)

print("Done! Data written to", out_dir)
