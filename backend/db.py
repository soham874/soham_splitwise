import pathlib

import mysql.connector
from mysql.connector import pooling

from backend.config import settings

_pool: pooling.MySQLConnectionPool | None = None

MIGRATIONS_DIR = pathlib.Path(__file__).parent / "migrations"


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


def _ensure_database(conn: mysql.connector.MySQLConnection) -> None:
    """Create the database and the schema_migrations tracking table."""
    cursor = conn.cursor()
    cursor.execute(
        f"CREATE DATABASE IF NOT EXISTS `{settings.MYSQL_DATABASE}` "
        "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    )
    cursor.execute(f"USE `{settings.MYSQL_DATABASE}`")
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version     VARCHAR(255) NOT NULL PRIMARY KEY,
            applied_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        """
    )
    conn.commit()
    cursor.close()


def _get_applied_versions(conn: mysql.connector.MySQLConnection) -> set[str]:
    """Return the set of migration versions already applied."""
    cursor = conn.cursor()
    cursor.execute(
        f"SELECT version FROM `{settings.MYSQL_DATABASE}`.schema_migrations"
    )
    versions = {row[0] for row in cursor.fetchall()}
    cursor.close()
    return versions


def _run_migration(conn: mysql.connector.MySQLConnection, path: pathlib.Path) -> None:
    """Execute a single migration file and record it in schema_migrations."""
    version = path.stem  # e.g. "V001__initial_schema"
    sql = path.read_text()

    cursor = conn.cursor()
    for statement in sql.split(";"):
        statement = statement.strip()
        if statement:
            cursor.execute(statement)
    # Record the migration
    cursor.execute(
        f"INSERT INTO `{settings.MYSQL_DATABASE}`.schema_migrations (version) VALUES (%s)",
        (version,),
    )
    conn.commit()
    cursor.close()
    print(f"[db] Applied migration: {version}")


def init_db() -> None:
    """Run all pending migrations from backend/migrations/ in order.

    Migration files must be named like V001__description.sql and are sorted
    alphabetically (i.e. by version number).  Each migration is executed at
    most once; applied versions are tracked in the schema_migrations table.
    """
    # Connect WITHOUT a database so CREATE DATABASE succeeds
    conn = mysql.connector.connect(
        host=settings.MYSQL_HOST,
        port=settings.MYSQL_PORT,
        user=settings.MYSQL_USER,
        password=settings.MYSQL_PASSWORD,
    )

    _ensure_database(conn)

    applied = _get_applied_versions(conn)

    # Collect and sort migration files
    migration_files = sorted(MIGRATIONS_DIR.glob("V*.sql"))

    pending = [f for f in migration_files if f.stem not in applied]

    if not pending:
        print(f"[db] All {len(applied)} migration(s) already applied – database up to date.")
    else:
        for mf in pending:
            _run_migration(conn, mf)
        print(f"[db] {len(pending)} migration(s) applied. Database ready.")

    conn.close()
