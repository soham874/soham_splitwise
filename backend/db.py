import pathlib

import mysql.connector
from mysql.connector import pooling

from backend.config import settings

_pool: pooling.MySQLConnectionPool | None = None

SCHEMA_SQL_PATH = pathlib.Path(__file__).with_name("schema.sql")


def _get_pool() -> pooling.MySQLConnectionPool:
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(
            pool_name="splitwise_pool",
            pool_size=5,
            host=settings.MYSQL_HOST,
            port=settings.MYSQL_PORT,
            user=settings.MYSQL_USER,
            password=settings.MYSQL_PASSWORD,
            database=settings.MYSQL_DATABASE,
        )
    return _pool


def get_connection() -> mysql.connector.MySQLConnection:
    """Return a connection from the pool."""
    return _get_pool().get_connection()


def init_db() -> None:
    """Execute backend/schema.sql to create the database and tables.

    The SQL script is idempotent, so this is safe to call on every startup.
    """
    sql = SCHEMA_SQL_PATH.read_text()

    # Connect WITHOUT a database so the CREATE DATABASE statement succeeds
    conn = mysql.connector.connect(
        host=settings.MYSQL_HOST,
        port=settings.MYSQL_PORT,
        user=settings.MYSQL_USER,
        password=settings.MYSQL_PASSWORD,
    )
    cursor = conn.cursor()
    for statement in sql.split(";"):
        statement = statement.strip()
        if statement:
            cursor.execute(statement)
    conn.commit()
    cursor.close()
    conn.close()

    print(f"[db] schema.sql executed – database '{settings.MYSQL_DATABASE}' ready.")
