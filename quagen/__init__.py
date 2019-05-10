from flask import Flask

import os

def create_app():

    """Create and configure an instance of the Flask application."""
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        # a default secret that should be overridden by instance config
        SECRET_KEY='dev',
        # store the database in the instance folder
        DATABASE=os.path.join(app.instance_path, 'quagen.sqlite')
    )

    # ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    # register the database commands
    from quagen import db
    db.init_app(app)

    # apply the blueprints to the app
    from quagen import api,web
    app.register_blueprint(api.bp, url_prefix='/api/v1')
    app.register_blueprint(web.bp)

    # make url_for('index') == url_for('web.index')
    app.add_url_rule('/', endpoint='index')

    return app