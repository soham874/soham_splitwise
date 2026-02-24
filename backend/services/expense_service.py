from typing import Optional
from decimal import Decimal

import requests

from backend.db import get_connection

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
    except Exception:
        rate = 1.0

    _rate_cache[currency_code] = rate
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


def sync_expenses_from_splitwise(trip_id: str, sw_expenses: list[dict]) -> None:
    """Bulk-insert Splitwise expenses into the local expenses table.

    For each expense, one row is created per user who has owed_share > 0.
    Amounts are converted to INR.  Location and category are left blank
    because Splitwise doesn't carry those fields.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        for exp in sw_expenses:
            description = exp.get("description", "")
            # Skip debt settlements
            if description.strip().lower() == "payment":
                continue
            expense_id = str(exp.get("id", ""))
            currency_code = exp.get("currency_code", "INR")
            rate = get_inr_rate(currency_code)
            # Extract date from Splitwise (format: "2025-01-15T12:00:00Z")
            raw_date = exp.get("date") or exp.get("created_at") or ""
            date_str = raw_date[:10] if raw_date else None

            users = exp.get("users", [])
            for u in users:
                owed = float(u.get("owed_share", 0))
                if owed <= 0:
                    continue
                amount_inr = round(owed * rate, 2)
                sw_user_id = u.get("user_id") or u.get("user", {}).get("id")
                cursor.execute(
                    """
                    INSERT INTO expenses
                        (trip_id, user_id, expense_id, location, category,
                         description, amount_inr, currency_code, original_amount, date)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        trip_id,
                        sw_user_id,
                        expense_id,
                        "",
                        "",
                        description,
                        amount_inr,
                        currency_code,
                        owed,
                        date_str,
                    ),
                )
        conn.commit()
        cursor.close()
    finally:
        conn.close()


def delete_expense_rows(expense_id: str) -> None:
    """Delete all rows for a given expense_id (Splitwise or local)."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM expenses WHERE expense_id = %s", (expense_id,))
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
                   date, created_at, updated_at
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
        if row.get("created_at"):
            row["created_at"] = str(row["created_at"])
        if row.get("updated_at"):
            row["updated_at"] = str(row["updated_at"])

    return rows
