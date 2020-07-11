"""
Creates main Flask application
"""
# pylint: disable=invalid-name

from datetime import datetime
import logging
import os

from flask import Flask
from flask import g

from quagen import config
from quagen import db
from quagen import api
from quagen import web


# Logging setup
logger = logging.getLogger()
formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")

stream_handler = logging.StreamHandler()
stream_handler.setFormatter(formatter)

logger.addHandler(stream_handler)
logger.setLevel(logging.DEBUG)


def create_app():
    """
    Create and configure an instance of the Flask application.

    Returns:
        (Flask) Flask application object
    """

    # init quagen config
    config.init()

    app = Flask(__name__, instance_relative_config=True, static_url_path="")
    app.config.from_mapping(SECRET_KEY=config.SETTING_APP_SECRET)

    # register the database commands
    app.teardown_appcontext(db.close)
    db.set_context(g)

    # apply the blueprints to the app
    app.register_blueprint(api.API, url_prefix="/api/v1")
    app.register_blueprint(web.WEB)

    # make url_for('index') == url_for('web.index')
    app.add_url_rule("/", endpoint="index")

    return app
