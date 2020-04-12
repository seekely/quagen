"""
Database queries
"""
import json
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
        "SELECT game_id, data  FROM game WHERE game_id = %s", [game_id], True
    )

    if row is not None:
        data = json.loads(row["data"])
        game = Game(data)

    return game


def get_unprocessed_game_ids():
    """
    Get the ids of games which have unprocessed game events

    Returns:
        (list) of game ids
    """
    rows = db.query("SELECT DISTINCT game_id FROM game_event WHERE processed = 0")
    game_ids = [row["game_id"] for row in rows]

    return game_ids


def get_unprocessed_game_events(game_id):
    """
    Retrieve the unprocessed game events from a specific game

    Returns:
        (list) of unprocessed game ids
    """
    rows = db.query(
        "SELECT data FROM game_event WHERE processed = 0 AND game_id = %s", [game_id]
    )

    events = [json.loads(row["data"]) for row in rows]

    return events


def insert_game(game):
    """
    Inserts a new Game object to the database

    Attr:
        game (Game): Game object to save
    """
    db.write(
        "INSERT INTO game (game_id, data, time_created, time_started, time_updated) VALUES (%s, %s, %s, %s, %s)",
        [
            game.game_id,
            json.dumps(game.get_sensitive_state()),
            game.time_created,
            game.time_started,
            game.time_updated,
        ],
    )


def insert_game_event(game_id, event):
    """
    Inserts a new game event into the database

    Attr:
        game_id (str): The game this event belongs to
        event (dict): Event dictionary
    """
    event["id"] = utils.generate_id()
    db.write(
        "INSERT INTO game_event (event_id, game_id, data, processed, time_created) VALUES (%s, %s, %s, %s, %s)",
        [event["id"], game_id, json.dumps(event), 0, int(time.time())],
    )


def update_game(game):
    """
    Updates an existing Game object to the database

    Attr:
        game (Game): Game object to save
    """
    game.updated()
    db.write(
        "UPDATE game SET game_id = %s, data = %s, time_completed = %s, time_started = %s, time_updated = %s WHERE game_id = %s",
        [
            game.game_id,
            json.dumps(game.get_sensitive_state()),
            game.time_completed,
            game.time_started,
            game.time_updated,
            game.game_id,
        ],
    )


def update_processed_events(event_ids):
    """
    Marks event ids as processed

    Attr:
        event_ids (list): Now processed event ids
    """
    parameters = ",".join(["%s"] * len(event_ids))
    db.write(
        f"UPDATE game_event SET processed = 1 WHERE event_id IN ({parameters})",
        event_ids,
    )
