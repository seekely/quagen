"""
Responsible for bringing the database up to date.
"""

import time

import psycopg2

from quagen import config
from quagen import db


def migrate(schema="quagen/sql/schema.sql"):
    """
    Installs the database schema (if missing) and runs any outstanding SQL
    migrations.

    Args:
        schema (string): Path to database schema SQL
    """
    print("Running database migrations")

    # If the game table is missing, we'll assume the entire schema is missing.
    # We'd be in a pretty funky state if this wasn't the case.
    try:
        db.query("SELECT game_id FROM game LIMIT 1")
    # pylint: disable=no-member
    except psycopg2.UndefinedTable:
        print("Schema missing, running database init")
        connection = db.get_connection()
        cursor = connection.cursor()
        cursor.execute(open(schema, "r").read())
        connection.commit()

    print("Database up to date")


def is_migrated():
    """
    If the database is running the latest migration

    Returns:
        (bool) True if up to date, false otherwise
    """
    migrated = True

    try:
        # @todo rseekely What we really want to do here is test the desired
        # version number against the version number currently in the db. But
        # that doesn't exist at the momment, so for now we'll just see if the
        # game table exists like above.
        db.query("SELECT game_id FROM game LIMIT 1")
    # pylint: disable=no-member
    except psycopg2.errors.UndefinedTable:
        migrated = False

    return migrated


def wait_until_migrated():
    """
    Waits until the migrator has completed its job before returning
    """
    while not is_migrated():
        print("Waiting until database is migrated...")
        time.sleep(5)


def main():
    """
    Main
    """
    print("Migrator starting up")
    config.init()

    # Retries connection to database until we succeed which allows the
    # migrator to come up before the database
    db.get_connection(True)

    # Run database migrations
    migrate()


if __name__ == "__main__":
    main()
