"""
Holds global config.
"""
import os

"""(str) Directory where the code is located"""
DIR_CODE = os.path.dirname(os.path.abspath(__file__))

"""(str) Location of all files produced by Quagen"""
DIR_INSTANCE = f"{os.getcwd()}/instance"

"""(str) Location of SQLite database"""
PATH_DB_FILE = f"{DIR_INSTANCE}/quagen.sqlite"

"""(str) Path to the database schema"""
PATH_DB_SCHEMA = f"{DIR_CODE}/sql/schema.sql"


def init():
    """
    Any initialization needed for the config to be valid
    """

    # ensure the instance folder exists
    try:
        os.makedirs(DIR_INSTANCE)
    except OSError:
        pass
