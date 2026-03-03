import logging
import time

import requests

from backend.db import get_connection

logger = logging.getLogger(__name__)

NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_HEADERS = {"User-Agent": "SohamSplitwise/1.0"}
NOMINATIM_RATE_LIMIT_SEC = 1.1


def _geocode_city(name: str) -> dict:
    """Call Nominatim to geocode a city name. Returns {name, lat, lon, display_name}."""
    try:
        resp = requests.get(
            NOMINATIM_SEARCH_URL,
            params={"q": name, "format": "json", "limit": 1},
            headers=NOMINATIM_HEADERS,
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        if data:
            return {
                "name": name,
                "lat": float(data[0]["lat"]),
                "lon": float(data[0]["lon"]),
                "display_name": data[0].get("display_name", ""),
            }
    except Exception:
        logger.warning("Nominatim geocode failed for '%s'", name, exc_info=True)

    return {"name": name, "lat": None, "lon": None, "display_name": ""}


def _insert_coord(name: str, lat: float | None, lon: float | None, display_name: str) -> None:
    """Insert a location coord row, ignoring duplicates."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT IGNORE INTO location_coords (name, lat, lon, display_name) "
            "VALUES (%s, %s, %s, %s)",
            (name, lat, lon, display_name),
        )
        conn.commit()
        cursor.close()
    finally:
        conn.close()


def get_location_coords(names: list[str]) -> list[dict]:
    """Return coords for the given location names, geocoding any that are missing (lazy backfill)."""
    if not names:
        return []

    # 1. Fetch existing from DB
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        placeholders = ",".join(["%s"] * len(names))
        cursor.execute(
            f"SELECT name, lat, lon, display_name FROM location_coords WHERE name IN ({placeholders})",
            tuple(names),
        )
        rows = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()

    found = {row["name"]: _row_to_coord(row) for row in rows}

    # 2. Geocode missing ones
    missing = [n for n in names if n not in found]
    for i, name in enumerate(missing):
        if i > 0:
            time.sleep(NOMINATIM_RATE_LIMIT_SEC)
        coord = _geocode_city(name)
        _insert_coord(coord["name"], coord["lat"], coord["lon"], coord["display_name"])
        found[coord["name"]] = coord
        logger.info("Geocoded '%s' -> lat=%s lon=%s", name, coord["lat"], coord["lon"])

    # 3. Return in the same order as input, filtering out any with null coords
    result = []
    for n in names:
        if n in found:
            result.append(found[n])
    return result


def _row_to_coord(row: dict) -> dict:
    return {
        "name": row["name"],
        "lat": float(row["lat"]) if row["lat"] is not None else None,
        "lon": float(row["lon"]) if row["lon"] is not None else None,
        "display_name": row.get("display_name", ""),
    }
