from typing import Optional

from backend.db import get_connection


def _row_to_dict(row: dict) -> dict:
    """Convert a DB row to the frontend-friendly trip dict."""
    return {
        "id": row["id"],
        "groupId": row["group_id"],
        "name": row["name"],
        "start": str(row["start_date"]) if row["start_date"] else "",
        "end": str(row["end_date"]) if row["end_date"] else "",
        "currencies": row["currencies"].split(",") if row["currencies"] else [],
        "locations": row["locations"].split(",") if row["locations"] else [],
        "created_by": row.get("created_by"),
    }


def create_trip(user_id: int, group_id: str, name: str,
                start_date: Optional[str], end_date: Optional[str],
                currencies: list[str],
                locations: list[str] | None = None,
                created_by: int | None = None) -> dict:
    """Insert a new trip for the given user and return it."""
    currencies_csv = ",".join(currencies) if currencies else ""
    locations_csv = ",".join(locations) if locations else ""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO trips (user_id, group_id, name, start_date, end_date, currencies, locations, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (user_id, group_id, name,
             start_date or None, end_date or None, currencies_csv, locations_csv,
             created_by or user_id),
        )
        trip_id = cursor.lastrowid
        conn.commit()
        cursor.close()
    finally:
        conn.close()

    return get_trip_by_id(trip_id)


def update_trip(trip_id: int, group_id: str, name: str,
                start_date: Optional[str], end_date: Optional[str],
                currencies: list[str],
                locations: list[str] | None = None) -> dict:
    """Update an existing trip by its ID and return it."""
    currencies_csv = ",".join(currencies) if currencies else ""
    locations_csv = ",".join(locations) if locations else ""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE trips
            SET group_id   = %s,
                name       = %s,
                start_date = %s,
                end_date   = %s,
                currencies = %s,
                locations  = %s
            WHERE id = %s
            """,
            (group_id, name,
             start_date or None, end_date or None,
             currencies_csv, locations_csv, trip_id),
        )
        conn.commit()
        cursor.close()
    finally:
        conn.close()

    return get_trip_by_id(trip_id)


def get_trips(user_id: int) -> list[dict]:
    """Return all trips for the given user."""
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, group_id, name, start_date, end_date, currencies, locations, created_by "
            "FROM trips WHERE user_id = %s ORDER BY created_at DESC",
            (user_id,),
        )
        rows = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()

    return [_row_to_dict(r) for r in rows]


def delete_trip(trip_id: int) -> None:
    """Delete a trip and all related expense rows."""
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        # Look up the group_id so we can delete matching expenses
        cursor.execute("SELECT group_id FROM trips WHERE id = %s", (trip_id,))
        row = cursor.fetchone()
        if row:
            cursor.execute(
                "DELETE FROM expenses WHERE trip_id = %s", (row["group_id"],)
            )
            cursor.execute("DELETE FROM trips WHERE id = %s", (trip_id,))
        conn.commit()
        cursor.close()
    finally:
        conn.close()


def get_trip_by_id(trip_id: int) -> Optional[dict]:
    """Return a single trip by its primary key, or None."""
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, group_id, name, start_date, end_date, currencies, locations, created_by "
            "FROM trips WHERE id = %s",
            (trip_id,),
        )
        row = cursor.fetchone()
        cursor.close()
    finally:
        conn.close()

    if not row:
        return None

    return _row_to_dict(row)
