"""
Holds global config.
"""
import os

"""(str) Directory where the code is located"""
DIR_CODE = os.path.dirname(os.path.abspath(__file__))

"""(str) Location of all files produced by Quagen"""
DIR_INSTANCE = f"{os.getcwd()}/../instance"

"""(str) Location of SQLite database"""
PATH_DB_FILE = f"{DIR_INSTANCE}/quagen.sqlite"

"""(str) Path to the database schema"""
PATH_DB_SCHEMA = f"{DIR_CODE}/sql/schema.sql"

"""
Database settings
"""
SETTING_DB_NAME = os.getenv("QUAGEN_DB_NAME", "quagen")
SETTING_DB_USER = os.getenv("QUAGEN_DB_USER", "quagen")
SETTING_DB_PASSWORD = os.getenv("QUAGEN_DB_PASSWORD", "quagen")
SETTING_DB_HOST = os.getenv("QUAGEN_DB_HOST", "db")
SETTING_DB_PORT = os.getenv("QUAGEN_DB_PORT", "5432")

"""(str) Flask Application secret for (used for signing/encryption). We don't want
to accidentally ship a default value here, so will have it throw an error if missing."""
SETTING_APP_SECRET = os.environ["QUAGEN_APP_SECRET"]


def init():
    """
    Any initialization needed for the config to be valid
    """

    # ensure the instance folder exists
    try:
        os.makedirs(DIR_INSTANCE)
    except OSError:
        pass
