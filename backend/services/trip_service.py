from typing import Optional

from backend.db import get_connection


def upsert_trip(user_id: int, group_id: str, name: str,
                start_date: Optional[str], end_date: Optional[str],
                currencies: list[str],
                locations: list[str] | None = None) -> dict:
    """Insert or update a trip for the given user.

    Each user has at most one active trip (enforced by UNIQUE on user_id).
    """
    currencies_csv = ",".join(currencies) if currencies else ""
    locations_csv = ",".join(locations) if locations else ""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO trips (user_id, group_id, name, start_date, end_date, currencies, locations)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                group_id   = VALUES(group_id),
                name       = VALUES(name),
                start_date = VALUES(start_date),
                end_date   = VALUES(end_date),
                currencies = VALUES(currencies),
                locations  = VALUES(locations)
            """,
            (user_id, group_id, name,
             start_date or None, end_date or None, currencies_csv, locations_csv),
        )
        conn.commit()
        cursor.close()
    finally:
        conn.close()

    return get_trip(user_id)


def get_trip(user_id: int) -> Optional[dict]:
    """Return the trip for the given user, or None."""
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT group_id, name, start_date, end_date, currencies, locations "
            "FROM trips WHERE user_id = %s",
            (user_id,),
        )
        row = cursor.fetchone()
        cursor.close()
    finally:
        conn.close()

    if not row:
        return None

    return {
        "groupId": row["group_id"],
        "name": row["name"],
        "start": str(row["start_date"]) if row["start_date"] else "",
        "end": str(row["end_date"]) if row["end_date"] else "",
        "currencies": row["currencies"].split(",") if row["currencies"] else [],
        "locations": row["locations"].split(",") if row["locations"] else [],
    }
