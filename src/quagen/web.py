"""
Serves Quagen HTML/Javascript frontend
"""
import uuid

from flask import Blueprint
from flask import render_template
from flask import session

from quagen import queries

WEB = Blueprint("web", __name__)

# @hack rseekely
# A way to un-cache static assets when a new version of the app comes out
ASSET_VERSION = 14


@WEB.context_processor
def inject_globals():
    """
    Injects a set of global variables to the HTML templates
    """
    return dict(asset_version=ASSET_VERSION)


@WEB.route("/")
def index():
    """
    Homepage
    """
    return render_template("index.html")


@WEB.route("/game/<string:game_id>", methods=["GET"])
def game_view(game_id):
    """
    Game view
    """
    if "player_id" not in session.keys():
        session["player_id"] = uuid.uuid4().hex

    state = queries.get_game(game_id).get_game_state()
    return render_template("game.html", game=state)
