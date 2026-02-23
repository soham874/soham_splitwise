from typing import Optional

from backend.db import get_connection


def upsert_user(splitwise_id: int, name: str, email: str) -> dict:
    """Insert or update a user based on their Splitwise ID.

    Returns the local user record including our auto-increment `id`.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO users (splitwise_id, name, email)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE
                name  = VALUES(name),
                email = VALUES(email)
            """,
            (splitwise_id, name, email),
        )
        conn.commit()
        cursor.close()
    finally:
        conn.close()

    return get_user_by_splitwise_id(splitwise_id)


def get_user_by_splitwise_id(splitwise_id: int) -> Optional[dict]:
    """Return the local user record for a given Splitwise ID, or None."""
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, splitwise_id, name, email FROM users WHERE splitwise_id = %s",
            (splitwise_id,),
        )
        row = cursor.fetchone()
        cursor.close()
    finally:
        conn.close()

    return row


def get_user_by_id(user_id: int) -> Optional[dict]:
    """Return the local user record by primary key, or None."""
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, splitwise_id, name, email FROM users WHERE id = %s",
            (user_id,),
        )
        row = cursor.fetchone()
        cursor.close()
    finally:
        conn.close()

    return row
