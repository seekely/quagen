"""
Serves Quagen frontend
"""
import uuid

from flask import Blueprint
from flask import render_template
from flask import session

from quagen import queries

BLUEPRINT = Blueprint("web", __name__)

# @hack rseekely
# A way to un-cache static assets when a new version of the app comes out
ASSET_VERSION = 12


@BLUEPRINT.context_processor
def inject_globals():
    """
    Injects a set of global variables to the HTML templates
    """
    return dict(asset_version=ASSET_VERSION)


@BLUEPRINT.route("/")
def index():
    """
    Homepage
    """
    return render_template("index.html")


@BLUEPRINT.route("/game/<string:game_id>", methods=["GET"])
def game_view(game_id):
    """
    Game view
    """
    if "player_id" not in session.keys():
        session["player_id"] = uuid.uuid4().hex

    game = queries.get_game(game_id).as_dict()
    return render_template("game.html", game=game)
