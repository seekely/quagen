"""
Interact with the SQLite database
"""
# @hack rseekely uggggh context being a global crap
# pylint: disable=invalid-name,global-statement
import logging
import time

from werkzeug.local import Local
import psycopg2

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

    try:
        connection = psycopg2.connect(
            connect_timeout=1,
            user=config.SETTING_DB_USER,
            password=config.SETTING_DB_PASSWORD,
            host=config.SETTING_DB_HOST,
            port=config.SETTING_DB_PORT,
            database=config.SETTING_DB_NAME,
        )
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
    if "db" not in context:
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
    cursor = connection.cursor()
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
    cursor = connection.cursor()
    cursor.execute(statement, args)

    return (cursor.lastrowid, cursor.rowcount)


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
