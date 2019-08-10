import os
import sqlite3
import types

from werkzeug.local import Local

from quagen import config

context = Local()


def set_context(new_context):
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


def query(query, args=(), one=False):

    conn = get_connection()

    cur = conn.execute(query, args)
    rv = [
        dict((cur.description[idx][0], value) for idx, value in enumerate(row))
        for row in cur.fetchall()
    ]

    return (rv[0] if rv else None) if one else rv


def write(query, args=(), commit=True):

    conn = get_connection()

    cur = conn.execute(query, args)
    if commit:
        conn.commit()

    return cur.lastrowid


def close(e=None):
    """ 
    Close any existing database connection
    """
    global context
    conn = context.pop("db", None)

    if conn is not None:
        conn.close()


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
