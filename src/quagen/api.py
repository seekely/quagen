"""
API for Quagen frontends to interact with backend.
"""
from flask import Blueprint
from flask import json
from flask import make_response
from flask import request
from flask import session

from quagen import queries
from quagen.game import Game

API = Blueprint("api", __name__)


@API.route("/game/new", methods=["POST"])
def game_new():
    """
    Creates a new Quagen game in the backend

    Post:
        ai_count (int): Number of AI players
        ai_strength (int): AI difficulty level
        dimension_x (int): Width of the game board
        dimension_y (int): Height of the game board
        player_count (int): Total number of players in a game
        power (int): Amount of power acquired for a spot to turn solid

    Returns:
        (Response) JSON game state
    """
    posted = request.get_json()

    # Parse out the settings from the post
    settings = {}
    possible_settings = Game.DEFAULT_SETTINGS.keys()
    for setting in possible_settings:
        if setting in posted:
            settings[setting] = int(posted[setting])

    # Create and start the game -- the start is called immediately for now
    # as we do not have a way to change settings or add players in the UI
    game = Game({"settings": settings})
    game.start()

    # Save the game to the database
    queries.insert_game(game)
    queries.insert_game_event(game.game_id, {"type": "start"})

    response = json.jsonify(game=game.get_game_state())
    return response


@API.route("/game/<string:game_id>", methods=["GET"])
def game_view(game_id):
    """
    Grabs the current state of a Quagen game.

    Args:
        game_id (str): Game to grab

    Get:
        updatedAfter (int): Optional timestamp to only return full game state
            if game state has changed after passed timestamp. Useful for
            saving bandwidth with our current short poll approach.

    Returns:
        (Response) JSON game state
    """
    response = make_response(json.jsonify({"error": "Not found"}), 404)
    updated_after = int(request.values.get("updatedAfter", 0))

    game = queries.get_game(game_id)
    if game:

        # Grab the game state
        state = game.get_game_state()

        # If nothing has changed, let's send a minimal response
        if state["time_updated"] <= updated_after:
            state = {"game_id": state["game_id"], "time_updated": state["time_updated"]}

        # Otherwise, send the full response
        # We tack on the projected board state here to make it quickly
        # accessible to the player's client -- maybe there is a better way?
        else:
            projected_board = game.board.project()
            state["projected"] = projected_board.spots

        response = json.jsonify(game=state)

    return response


@API.route("/game/<game_id>/move/<int:x>/<int:y>", methods=["GET", "POST"])
def game_move(game_id, x, y):
    """
    Makes a move for a Quagen game

    Args:
        game_id (str): Id of game to take a move
        x (int): x location of move
        y (int): y location of move

    Returns:
        (Response) JSON coordinates of move
    """
    game = queries.get_game(game_id)
    if game and "player_id" in session.keys():
        player_id = session["player_id"]

        # Inserts a move game event to be picked up asynchronously by our
        # backround workers.
        event = {"type": "move", "player_id": player_id, "x": int(x), "y": int(y)}
        queries.insert_game_event(game_id, event)

    response = json.jsonify({"x": x, "y": y})
    return response
