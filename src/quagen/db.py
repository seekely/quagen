"""
Interact with the SQLite database
"""
# @hack rseekely uggggh context being a global crap
# pylint: disable=invalid-name,global-statement
import logging
import time

from werkzeug.local import Local
import psycopg2
from psycopg2.extras import LoggingConnection


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


def make_connection(retry=False):
    """
    Makes a new connection to the configred database.

    Args:
        retry (bool): In case of failure, keep retrying the connection every 5
        seconds until success.

    Returns:
        (Connection): Database connection
    """
    connection = None
    logging.debug("Creating new database connection")

    try:
        connection = psycopg2.connect(
            connect_timeout=1,
            user=config.SETTING_DB_USER,
            password=config.SETTING_DB_PASSWORD,
            host=config.SETTING_DB_HOST,
            port=config.SETTING_DB_PORT,
            database=config.SETTING_DB_NAME,
            # Uncomment for debugging queries
            # connection_factory=LoggingConnection,
        )

        # Uncomment for debugging queries
        # connection.initialize(logging.getLogger())

        connection.autocommit = False

    except psycopg2.OperationalError as error:
        if not retry:
            raise error

        logging.error("Error connecting to db. Trying reconnect in 5 seconds...")
        logging.debug(error)
        time.sleep(5)
        return make_connection(True)

    except (Exception, psycopg2.Error) as error:
        raise error

    return connection


def get_connection(retry=False):
    """
    Retrieve the connection to the configured database. Makes a connection
    if none already exists.

    Returns:
        (Connection): Database connection
    """
    global context
    if not hasattr(context, "db"):
        context.db = make_connection(retry)

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
    connection = get_connection()
    rv = None
    with connection.cursor() as cursor:
        cursor.execute(statement, parameters)

        rv = [
            dict((cursor.description[idx][0], value) for idx, value in enumerate(row))
            for row in cursor.fetchall()
        ]

    return (rv[0] if rv else None) if one else rv


def write(statement, args=()):
    """
    Writes to the database (e.g. INSERT/UPDATE)

    Args:
        statement (str): Prepared SQL statement
            (e.g. 'INSERT INTO GAME VALUES(?, ?, ?)')
        parameters (tuple): Optional parameters to inject into SQL statement

    Returns:
        (tuple) Last row id, Number of affected rows
    """
    connection = get_connection()
    with connection.cursor() as cursor:
        cursor.execute(statement, args)

        if 0 < len(connection.notices):
            logging.warn(f"Query warnings: {connection.notices}")

        return (cursor.lastrowid, cursor.rowcount)

    return (-1, -1)


def close(error=None):
    """
    Closes any existing database connection
    """
    global context
    conn = context.pop("db", None)

    if conn is not None:
        logging.debug(f"Closing database connection {conn}")
        conn.close()

    if error:
        pass
