"""
API for Quagen frontend to interact with backend.
"""
from flask import Blueprint
from flask import json
from flask import make_response
from flask import request
from flask import session

from quagen import queries
from quagen.game import Game

BLUEPRINT = Blueprint("api", __name__)


@BLUEPRINT.route("/game/new", methods=["POST"])
def game_new():
    """
    Creates a new Quagen game
    """
    posted = request.get_json()

    settings = {}
    possible_settings = Game.DEFAULT_SETTINGS.keys()
    for setting in possible_settings:
        if setting in posted:
            settings[setting] = int(posted[setting])

    game = Game({"settings": settings})
    game.start()

    queries.insert_game(game)
    queries.insert_game_event(game.game_id, {"type": "start"})

    response = json.jsonify(game=game.as_dict())
    return response


@BLUEPRINT.route("/game/<string:game_id>", methods=["GET"])
def game_view(game_id):
    """
    Grabs the current state of a Quagen game
    """
    response = make_response(json.jsonify({"error": "Not found"}), 404)
    updated_after = int(request.values.get("updatedAfter", 0))

    game = queries.get_game(game_id)
    if game:
        game_dict = game.as_dict()

        if game_dict["time_updated"] <= updated_after:
            game_dict = {
                "game_id": game_dict["game_id"],
                "time_updated": game_dict["time_updated"],
            }
        else:
            projected_board = game.board.project()
            game_dict["projected"] = projected_board.spots

        response = json.jsonify(game=game_dict)

    return response


@BLUEPRINT.route("/game/<game_id>/move/<int:x>/<int:y>", methods=["GET", "POST"])
def game_move(game_id, x, y):
    """
    Makes a move for a Quagen game
    """
    game = queries.get_game(game_id)
    if game and "player_id" in session.keys():
        player_id = session["player_id"]

        event = {"type": "move", "player_id": player_id, "x": int(x), "y": int(y)}
        queries.insert_game_event(game_id, event)
        print("Taking turn for player " + player_id)

    response = json.jsonify({"x": x, "y": y})
    return response