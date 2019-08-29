"""
Serves Quagen frontend
"""
import uuid

from flask import Blueprint
from flask import render_template
from flask import session

from quagen import queries

BLUEPRINT = Blueprint("web", __name__)


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


@BLUEPRINT.route("/newui/<string:game_id>", methods=["GET"])
def newui_view(game_id):
    """
    Game view
    """
    if "player_id" not in session.keys():
        session["player_id"] = uuid.uuid4().hex

    game = queries.get_game(game_id).as_dict()
    return render_template("newui.html", game=game)
