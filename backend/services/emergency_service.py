import logging
import time
from typing import Optional

import requests

from backend.db import get_connection

logger = logging.getLogger(__name__)

NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
NOMINATIM_HEADERS = {"User-Agent": "SohamSplitwise/1.0"}

CATEGORY_OVERPASS_TAGS = {
    "hospital": '["amenity"="hospital"]',
    "police": '["amenity"="police"]',
    "pharmacy": '["amenity"="pharmacy"]',
}

CACHE_MAX_AGE_DAYS = 30


def _resolve_osm_area_id(location: str) -> Optional[int]:
    """Resolve a city name to an Overpass area ID via Nominatim."""
    try:
        resp = requests.get(
            NOMINATIM_SEARCH_URL,
            params={"q": location, "format": "json", "limit": 1},
            headers=NOMINATIM_HEADERS,
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        if data and data[0].get("osm_type") == "relation":
            return 3600000000 + int(data[0]["osm_id"])
        if data and data[0].get("osm_type") == "way":
            return 2400000000 + int(data[0]["osm_id"])
        if data and data[0].get("osm_type") == "node":
            # Nodes can't be used as areas — fall back to bounding box search
            return None
    except Exception:
        logger.warning("Nominatim lookup failed for '%s'", location, exc_info=True)
    return None


def _build_overpass_query(area_id: int, category: str) -> str:
    """Build an Overpass QL query for a category within an area."""
    tag = CATEGORY_OVERPASS_TAGS.get(category, '["amenity"="hospital"]')
    return f"""
[out:json][timeout:15];
area({area_id})->.a;
(
  node{tag}(area.a);
  way{tag}(area.a);
  relation{tag}(area.a);
);
out center body 50;
"""


def _build_overpass_bbox_query(lat: float, lon: float, category: str, radius_deg: float = 0.15) -> str:
    """Fallback: bounding-box query when we can't resolve an area ID."""
    tag = CATEGORY_OVERPASS_TAGS.get(category, '["amenity"="hospital"]')
    south = lat - radius_deg
    north = lat + radius_deg
    west = lon - radius_deg
    east = lon + radius_deg
    return f"""
[out:json][timeout:15];
(
  node{tag}({south},{west},{north},{east});
  way{tag}({south},{west},{north},{east});
);
out center body 50;
"""


def _parse_overpass_elements(elements: list, category: str) -> list[dict]:
    """Parse Overpass JSON elements into a flat list of service dicts."""
    results = []
    seen_ids = set()
    for el in elements:
        osm_id = el.get("id")
        if osm_id in seen_ids:
            continue
        seen_ids.add(osm_id)
        tags = el.get("tags", {})

        name = (
            tags.get("name:en")
            or tags.get("int_name")
            or tags.get("name")
            or tags.get("official_name")
            or ""
        )
        if not name:
            continue

        lat = el.get("lat") or (el.get("center", {}).get("lat"))
        lon = el.get("lon") or (el.get("center", {}).get("lon"))

        addr_parts = []
        for key in ("addr:housenumber", "addr:street", "addr:city", "addr:postcode"):
            val = tags.get(key)
            if val:
                addr_parts.append(val)
        address = ", ".join(addr_parts) if addr_parts else tags.get("addr:full", "")

        phone = tags.get("phone") or tags.get("contact:phone") or ""
        opening_hours = tags.get("opening_hours", "")

        results.append({
            "category": category,
            "name": name,
            "address": address,
            "phone": phone,
            "opening_hours": opening_hours,
            "lat": float(lat) if lat else None,
            "lon": float(lon) if lon else None,
            "osm_id": el.get("id"),
        })
    return results


def _fetch_from_overpass(location: str, category: str) -> list[dict]:
    """Fetch emergency services from Overpass API for a location + category."""
    area_id = _resolve_osm_area_id(location)

    if area_id:
        query = _build_overpass_query(area_id, category)
    else:
        # Fallback: get coords from Nominatim and do bbox search
        try:
            resp = requests.get(
                NOMINATIM_SEARCH_URL,
                params={"q": location, "format": "json", "limit": 1},
                headers=NOMINATIM_HEADERS,
                timeout=10,
            )
            data = resp.json()
            if not data:
                logger.warning("Nominatim returned no results for '%s'", location)
                return []
            lat, lon = float(data[0]["lat"]), float(data[0]["lon"])
            query = _build_overpass_bbox_query(lat, lon, category)
        except Exception:
            logger.warning("Fallback geocode failed for '%s'", location, exc_info=True)
            return []

    try:
        resp = requests.post(
            OVERPASS_URL,
            data={"data": query},
            headers={"User-Agent": "SohamSplitwise/1.0"},
            timeout=20,
        )
        resp.raise_for_status()
        elements = resp.json().get("elements", [])
        return _parse_overpass_elements(elements, category)
    except Exception:
        logger.warning("Overpass query failed for '%s' / '%s'", location, category, exc_info=True)
        return []


def _get_cached(location: str, category: str) -> Optional[list[dict]]:
    """Return cached results if they exist and are fresh enough."""
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT name, address, phone, opening_hours, lat, lon, osm_id, created_at "
            "FROM emergency_services_cache "
            "WHERE location = %s AND category = %s "
            "AND created_at > DATE_SUB(NOW(), INTERVAL %s DAY)",
            (location, category, CACHE_MAX_AGE_DAYS),
        )
        rows = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()

    if not rows:
        return None

    return [
        {
            "category": category,
            "name": r["name"],
            "address": r["address"],
            "phone": r["phone"],
            "opening_hours": r.get("opening_hours", ""),
            "lat": float(r["lat"]) if r["lat"] is not None else None,
            "lon": float(r["lon"]) if r["lon"] is not None else None,
            "osm_id": r["osm_id"],
        }
        for r in rows
    ]


def _save_to_cache(location: str, category: str, services: list[dict]) -> None:
    """Save fetched services to DB cache, replacing old entries for this location+category."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM emergency_services_cache WHERE location = %s AND category = %s",
            (location, category),
        )
        for s in services:
            cursor.execute(
                "INSERT INTO emergency_services_cache "
                "(location, category, name, address, phone, opening_hours, lat, lon, osm_id) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (location, category, s["name"], s["address"], s["phone"],
                 s.get("opening_hours", ""), s["lat"], s["lon"], s["osm_id"]),
            )
        conn.commit()
        cursor.close()
    finally:
        conn.close()


def get_emergency_services(location: str, category: str) -> list[dict]:
    """Get emergency services for a location + category, using cache when available.

    category must be one of: hospital, police, pharmacy
    """
    if category not in CATEGORY_OVERPASS_TAGS:
        return []

    # Try cache first
    cached = _get_cached(location, category)
    if cached is not None:
        logger.info("Cache hit: %d %s(s) for '%s'", len(cached), category, location)
        return cached

    # Fetch from Overpass
    logger.info("Cache miss — querying Overpass for %s in '%s'", category, location)
    services = _fetch_from_overpass(location, category)

    # Cache even empty results to avoid hammering Overpass
    _save_to_cache(location, category, services)
    logger.info("Fetched and cached %d %s(s) for '%s'", len(services), category, location)

    return services


def get_all_emergency_services(location: str) -> dict[str, list[dict]]:
    """Fetch all categories for a location. Returns {category: [services]}."""
    result = {}
    for i, category in enumerate(CATEGORY_OVERPASS_TAGS):
        if i > 0:
            time.sleep(0.5)  # Be polite to Overpass
        result[category] = get_emergency_services(location, category)
    return result
