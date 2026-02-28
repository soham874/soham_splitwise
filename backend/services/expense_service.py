import logging
from typing import Optional
from decimal import Decimal

import requests

from backend.db import get_connection

logger = logging.getLogger(__name__)

EXCHANGE_RATE_API = "https://v6.exchangerate-api.com/v6/bd518438bcd832b6b743de47/pair"

# In-memory cache: { "USD": rate_float, ... }
_rate_cache: dict[str, float] = {}


def get_inr_rate(currency_code: str) -> float:
    """Return the exchange rate from *currency_code* to INR.

    Returns 1.0 if the currency is already INR.
    Uses a simple in-memory cache to avoid repeated API calls within the
    same process lifetime.
    """
    if currency_code == "INR":
        return 1.0

    if currency_code in _rate_cache:
        return _rate_cache[currency_code]

    try:
        resp = requests.get(f"{EXCHANGE_RATE_API}/{currency_code}/INR", timeout=10)
        data = resp.json()
        rate = float(data.get("conversion_rate", 1.0))
        logger.debug("Exchange rate %s->INR = %s", currency_code, rate)
    except Exception:
        logger.warning("Failed to fetch exchange rate for %s->INR, defaulting to 1.0", currency_code)
        rate = 1.0

    _rate_cache[currency_code] = rate
    return rate


def get_conversion_rate(from_code: str, to_code: str) -> float:
    """Return the exchange rate from *from_code* to *to_code*.

    Returns 1.0 if both codes are the same.
    Uses a simple in-memory cache keyed by 'FROM->TO'.
    """
    if from_code == to_code:
        return 1.0

    cache_key = f"{from_code}->{to_code}"
    if cache_key in _rate_cache:
        return _rate_cache[cache_key]

    try:
        resp = requests.get(f"{EXCHANGE_RATE_API}/{from_code}/{to_code}", timeout=10)
        data = resp.json()
        rate = float(data.get("conversion_rate", 1.0))
        logger.debug("Exchange rate %s->%s = %s", from_code, to_code, rate)
    except Exception:
        logger.warning("Failed to fetch exchange rate for %s->%s, defaulting to 1.0", from_code, to_code)
        rate = 1.0

    _rate_cache[cache_key] = rate
    return rate


def save_expense_rows(
    trip_id: str,
    expense_id: Optional[str],
    description: str,
    location: str,
    category: str,
    currency_code: str,
    users: list[dict],
    date_str: Optional[str] = None,
) -> None:
    """Insert one row per user into the expenses table.

    Each dict in *users* must have keys: user_id, owed_share.
    The amount is converted to INR before storing.
    """
    rate = get_inr_rate(currency_code)
    logger.info("save_expense_rows: expense_id=%s trip_id=%s users=%d currency=%s", expense_id, trip_id, len(users), currency_code)
    conn = get_connection()
    try:
        cursor = conn.cursor()
        for u in users:
            owed = float(u.get("owed_share", 0))
            if owed <= 0:
                continue
            amount_inr = round(owed * rate, 2)
            cursor.execute(
                """
                INSERT INTO expenses
                    (trip_id, user_id, expense_id, location, category,
                     description, amount_inr, currency_code, original_amount, date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    trip_id,
                    u["user_id"],
                    expense_id,
                    location,
                    category,
                    description,
                    amount_inr,
                    currency_code,
                    owed,
                    date_str or None,
                ),
            )
        conn.commit()
        cursor.close()
    finally:
        conn.close()


def sync_expenses_from_splitwise(trip_id: str, sw_expenses: list[dict]) -> int:
    """Sync Splitwise expenses into the local expenses table.

    Uses exactly 3 DB round-trips:
      1. SELECT all existing rows for this trip
      2. Batch INSERT ... ON DUPLICATE KEY UPDATE for all active Splitwise rows
      3. Batch DELETE for stale expense_ids no longer on Splitwise

    User-set location and category are preserved on update.
    Returns the number of newly inserted rows.
    """
    logger.info("sync_expenses_from_splitwise: trip_id=%s incoming=%d", trip_id, len(sw_expenses))

    # ── Build the desired state from Splitwise (pure Python, no DB) ──
    active_sw_ids: set[str] = set()
    upsert_rows: list[tuple] = []
    for exp in sw_expenses:
        description = exp.get("description", "")
        if description.strip().lower() == "payment":
            continue
        expense_id = str(exp.get("id", ""))
        active_sw_ids.add(expense_id)
        currency_code = exp.get("currency_code", "INR")
        rate = get_inr_rate(currency_code)
        raw_date = exp.get("date") or exp.get("created_at") or ""
        date_str = raw_date[:10] if raw_date else None

        for u in exp.get("users", []):
            owed = float(u.get("owed_share", 0))
            if owed <= 0:
                continue
            sw_user_id = u.get("user_id") or u.get("user", {}).get("id")
            amount_inr = round(owed * rate, 2)
            upsert_rows.append((
                trip_id, sw_user_id, expense_id, "", "",
                description, amount_inr, currency_code, owed, date_str,
            ))

    conn = get_connection()
    try:
        cursor = conn.cursor()

        # ── DB call 1: Read all existing (expense_id, user_id) for this trip ──
        cursor.execute(
            "SELECT expense_id, user_id FROM expenses WHERE trip_id = %s AND expense_id != ''",
            (trip_id,),
        )
        existing_pairs = {(str(row[0]), str(row[1])) for row in cursor.fetchall()}
        existing_eids = {pair[0] for pair in existing_pairs}

        # Split into new inserts vs updates (Python-side, no extra DB calls)
        insert_rows = []
        update_rows = []
        for row in upsert_rows:
            # row = (trip_id, user_id, expense_id, loc, cat, desc, amt, cur, orig, date)
            eid, uid = str(row[2]), str(row[1])
            if (eid, uid) in existing_pairs:
                # (desc, amount_inr, currency_code, original_amount, date, trip_id, expense_id, user_id)
                update_rows.append((row[5], row[6], row[7], row[8], row[9], row[0], row[2], row[1]))
            else:
                insert_rows.append(row)

        # ── DB call 2a: Batch insert new rows ──
        if insert_rows:
            cursor.executemany(
                """
                INSERT INTO expenses
                    (trip_id, user_id, expense_id, location, category,
                     description, amount_inr, currency_code, original_amount, date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                insert_rows,
            )
        inserted = len(insert_rows)

        # ── DB call 2b: Batch update existing rows ──
        if update_rows:
            cursor.executemany(
                """
                UPDATE expenses
                SET description = %s, amount_inr = %s, currency_code = %s,
                    original_amount = %s, date = %s
                WHERE trip_id = %s AND expense_id = %s AND user_id = %s
                """,
                update_rows,
            )
        updated = len(update_rows)

        # ── DB call 3: Batch delete stale expense_ids ──
        stale_ids = [eid for eid in existing_eids
                     if not eid.startswith("local_") and eid not in active_sw_ids]
        deleted = 0
        if stale_ids:
            placeholders = ",".join(["%s"] * len(stale_ids))
            cursor.execute(
                f"DELETE FROM expenses WHERE trip_id = %s AND expense_id IN ({placeholders})",
                [trip_id] + stale_ids,
            )
            deleted = cursor.rowcount

        conn.commit()
        cursor.close()
        logger.info("sync_expenses_from_splitwise: trip_id=%s inserted=%d updated=%d deleted=%d", trip_id, inserted, updated, deleted)
    finally:
        conn.close()
    return inserted


def delete_expense_rows(expense_id: str) -> None:
    """Delete all rows for a given expense_id (Splitwise or local)."""
    logger.info("delete_expense_rows: expense_id=%s", expense_id)
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM expenses WHERE expense_id = %s", (expense_id,))
        logger.debug("Deleted %d expense rows for expense_id=%s", cursor.rowcount, expense_id)
        conn.commit()
        cursor.close()
    finally:
        conn.close()


def get_expenses_by_trip(trip_id: str) -> list[dict]:
    """Return all expense rows for a trip, ordered by date desc."""
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, trip_id, user_id, expense_id, location, category,
                   description, amount_inr, currency_code, original_amount,
                   date, start_date, end_date, created_at, updated_at
            FROM expenses
            WHERE trip_id = %s
            ORDER BY date DESC, created_at DESC
            """,
            (trip_id,),
        )
        rows = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()

    # Convert Decimal to float for JSON serialisation
    for row in rows:
        if isinstance(row.get("amount_inr"), Decimal):
            row["amount_inr"] = float(row["amount_inr"])
        if isinstance(row.get("original_amount"), Decimal):
            row["original_amount"] = float(row["original_amount"])
        if row.get("date"):
            row["date"] = str(row["date"])
        if row.get("start_date"):
            row["start_date"] = str(row["start_date"])
        if row.get("end_date"):
            row["end_date"] = str(row["end_date"])
        if row.get("created_at"):
            row["created_at"] = str(row["created_at"])
        if row.get("updated_at"):
            row["updated_at"] = str(row["updated_at"])

    return rows


def get_user_expenses_by_trip(trip_id: str, splitwise_user_id: int) -> list[dict]:
    """Return expense rows for a specific user in a trip, ordered by date desc."""
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, trip_id, user_id, expense_id, location, category,
                   description, amount_inr, currency_code, original_amount,
                   date, start_date, end_date, created_at, updated_at
            FROM expenses
            WHERE trip_id = %s AND user_id = %s
            ORDER BY date DESC, created_at DESC
            """,
            (trip_id, splitwise_user_id),
        )
        rows = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()

    for row in rows:
        if isinstance(row.get("amount_inr"), Decimal):
            row["amount_inr"] = float(row["amount_inr"])
        if isinstance(row.get("original_amount"), Decimal):
            row["original_amount"] = float(row["original_amount"])
        if row.get("date"):
            row["date"] = str(row["date"])
        if row.get("start_date"):
            row["start_date"] = str(row["start_date"])
        if row.get("end_date"):
            row["end_date"] = str(row["end_date"])
        if row.get("created_at"):
            row["created_at"] = str(row["created_at"])
        if row.get("updated_at"):
            row["updated_at"] = str(row["updated_at"])

    return rows


def get_personal_expenses(trip_id: str, splitwise_user_id: int) -> list[dict]:
    """Return local-only personal expenses for a trip, shaped like Splitwise expenses
    so the frontend ExpenseHistory can render them directly."""
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT expense_id, description, currency_code, original_amount,
                   user_id, date, created_at, location, category
            FROM expenses
            WHERE trip_id = %s AND expense_id LIKE 'local_%%'
            ORDER BY date DESC, created_at DESC
            """,
            (trip_id,),
        )
        rows = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()

    logger.info("get_personal_expenses: trip_id=%s found %d rows", trip_id, len(rows))

    # Normalise types coming from MySQL
    for row in rows:
        if isinstance(row.get("original_amount"), Decimal):
            row["original_amount"] = float(row["original_amount"])
        if row.get("date"):
            row["date"] = str(row["date"])
        if row.get("created_at"):
            row["created_at"] = str(row["created_at"])

    # Group rows by expense_id (personal expenses typically have 1 row)
    grouped: dict[str, list] = {}
    for row in rows:
        eid = row["expense_id"]
        grouped.setdefault(eid, []).append(row)

    expenses = []
    for eid, group_rows in grouped.items():
        first = group_rows[0]
        total = sum(float(r.get("original_amount", 0)) for r in group_rows)
        users = []
        for r in group_rows:
            amt = float(r.get("original_amount", 0))
            users.append({
                "user_id": r["user_id"],
                "user": {"first_name": "You", "id": r["user_id"]},
                "paid_share": f"{amt:.2f}",
                "owed_share": f"{amt:.2f}",
            })
        expenses.append({
            "id": eid,
            "description": first.get("description", ""),
            "cost": f"{total:.2f}",
            "currency_code": first.get("currency_code", "INR"),
            "created_at": str(first.get("created_at", "")),
            "date": str(first.get("date", "")) if first.get("date") else None,
            "details": "",
            "users": users,
            "personal": True,
            "location": first.get("location", ""),
            "category": first.get("category", ""),
        })

    return expenses


def update_expense_details(expense_row_id: int, location: str, category: str) -> None:
    """Update location and category on a single expense row by its PK."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE expenses SET location = %s, category = %s WHERE id = %s",
            (location, category, expense_row_id),
        )
        conn.commit()
        cursor.close()
    finally:
        conn.close()


def update_stay_dates(
    expense_row_id: int,
    start_date: Optional[str],
    end_date: Optional[str],
    location: Optional[str] = None,
) -> None:
    """Update the date (check-in), end_date (check-out) and location on a stay expense row."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE expenses SET start_date = %s, end_date = %s, location = %s WHERE id = %s",
            (start_date or None, end_date or None, location or "", expense_row_id),
        )
        conn.commit()
        cursor.close()
    finally:
        conn.close()
