import os

from flask import Flask
from flask import g

from quagen import config
from quagen import db
from quagen import api
from quagen import web


def create_app():
    """
    Create and configure an instance of the Flask application.

    Returns:
        (Flask) Flask application object
    """

    # init quagen config
    config.init()

    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        # @todo rseekely a default secret that should be overridden by instance config
        SECRET_KEY="dev"
    )

    # register the database commands
    app.teardown_appcontext(db.close)
    db.set_context(g)

    # apply the blueprints to the app
    app.register_blueprint(api.bp, url_prefix="/api/v1")
    app.register_blueprint(web.bp)

    # make url_for('index') == url_for('web.index')
    app.add_url_rule("/", endpoint="index")

    return app
