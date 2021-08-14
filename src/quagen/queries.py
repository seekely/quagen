"""
Database queries
"""
import json
import logging
import time

from quagen import db
from quagen.game import Game
from quagen import utils


def get_game(game_id):
    """
    Retrieves a Game from the database

    Attr:
        game_id (str): Id of the game to retrieve

    Returns:
        Game object
    """
    game = None
    row = db.query(
        "SELECT game_id, data FROM game WHERE game_id = %s", [game_id], one=True
    )

    if row is not None:
        data = json.loads(row["data"])
        game = Game(data)

    return game


def get_unprocessed_game_id():
    """
    Get the ids of games which have unprocessed game events

    Returns:
        (list) of game ids
    """
    game = None
    row = db.query(
        "SELECT game_id, data FROM game WHERE awaiting_moves <= 0 FOR UPDATE SKIP LOCKED",
        one=True,
    )

    if row is not None:
        data = json.loads(row["data"])
        game = Game(data)

    return game


def get_game_moves(game_id, turn):
    """
    Retrieve the unprocessed game events from a specific game

    Returns:
        (list) of unprocessed game ids
    """
    moves = db.query(
        "SELECT event_id, game_id, player_id, turn, x, y, time_created FROM game_move WHERE game_id = %s and turn = %s",
        [game_id, turn],
    )

    return moves


def insert_game(game):
    """
    Inserts a new Game object to the database

    Attr:
        game (Game): Game object to save
    """
    db.write(
        "INSERT INTO game (game_id, data, awaiting_moves, time_created, time_started, time_updated) VALUES (%s, %s, %s, %s, %s, %s)",
        [
            game.game_id,
            json.dumps(game.get_sensitive_state()),
            game.human_count,
            game.time_created,
            game.time_started,
            game.time_updated,
        ],
    )


def insert_game_move(game_id, player_id, turn, x, y):
    """
    Inserts a new game move into the database. If a move already exists for
    the player for this game/turn, it's ignored.

    Attr:
        game_id (str): The game this event belongs to
        player_id (str): Unique player id
        turn (int): Turn number in the game
        x (int): x coordinate of the move
        y (int): y coordinate of the move
        is_ai (bool): If the move is meant for an ai player

    Returns:
        (bool) True when the move is new and inserted

    """
    event_id = utils.generate_id()

    last_id, row_count = db.write(
        "INSERT INTO game_move (event_id, game_id, player_id, turn, x, y, time_created) VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT DO NOTHING",
        [event_id, game_id, player_id, turn, x, y, int(time.time())],
    )

    if 0 < row_count:
        db.write(
            "UPDATE game SET awaiting_moves = (awaiting_moves - 1) WHERE game_id = %s",
            [game_id],
        )

    return 0 < row_count


def update_game(game):
    """
    Updates an existing Game object to the database

    Attr:
        game (Game): Game object to save
    """
    game.updated()
    db.write(
        "UPDATE game SET data = %s, time_completed = %s, time_started = %s, time_updated = %s WHERE game_id = %s",
        [
            json.dumps(game.get_sensitive_state()),
            game.time_completed,
            game.time_started,
            game.time_updated,
            game.game_id,
        ],
    )


def reset_game_awaiting_moves(game):
    """
    Updates an existing Game object to the database

    Attr:
        game (Game): Game object to save
    """
    db.write(
        "UPDATE game SET awaiting_moves = %s WHERE game_id = %s",
        [
            game.human_count,
            game.game_id,
        ],
    )
