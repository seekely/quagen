"""
Interact with the SQLite database
"""
# @hack rseekely uggggh context crap
# pylint: disable=invalid-name,global-statement
import os
import sqlite3

from werkzeug.local import Local

from quagen import config

# Allows us to share our database connection in a WSGI environment
# https://werkzeug.palletsprojects.com/en/0.16.x/local/
context = Local()


def set_context(new_context):
    """
    Set thread context for sharing db connection
    """
    global context
    context = new_context


def get_connection():
    """
    Retrieve the connection to the configured database to the configured
    database. Makes a connection if none already exists.

    Returns:
        (Connection): Database connection
    """
    global context
    if "db" not in context:
        context.db = sqlite3.connect(
            config.PATH_DB_FILE, detect_types=sqlite3.PARSE_DECLTYPES
        )
        context.db.row_factory = sqlite3.Row

    return context.db


def query(statement, parameters=(), one=False):
    """
    Query the database (e.g. SELECT)

    Args:
        statement (str): Prepared SQL statement
            (e.g. 'SELECT game_id FROM game WHERE game_id = ?')
        parameters (tuple): Optional parameters to inject into SQL statement
        one (bool): Optionally return only the first result

    Returns:
        (list) Rows of query results

    """
    conn = get_connection()

    cur = conn.execute(statement, parameters)
    rv = [
        dict((cur.description[idx][0], value) for idx, value in enumerate(row))
        for row in cur.fetchall()
    ]

    return (rv[0] if rv else None) if one else rv


def write(statement, args=(), commit=True):
    """
    Writes to the database (e.g. INSERT/UPDATE)

    Args:
        statement (str): Prepared SQL statement
            (e.g. 'INSERT INTO GAME VALUES(?, ?, ?)')
        parameters (tuple): Optional parameters to inject into SQL statement
        commit: Commit statement to the database. Defaults to true.

    Returns:
        (int) Last row id
    """
    conn = get_connection()

    cur = conn.execute(statement, args)
    if commit:
        conn.commit()

    return cur.lastrowid


def close(error=None):
    """
    Closes any existing database connection
    """
    global context
    conn = context.pop("db", None)

    if conn is not None:
        conn.close()

    if error:
        pass


def create():
    """
    If no database exists, import a fresh copy of the schema.
    """

    if not os.path.exists(config.PATH_DB_FILE):
        conn = get_connection()
        with open(config.PATH_DB_SCHEMA, mode="r", encoding="utf-8") as f:
            script = f.read()
            conn.executescript(script)


if __name__ == "__main__":
    create()
    print("Initialized the database.")
