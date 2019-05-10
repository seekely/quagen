import json

from quagen import db
from quagen.game import Game

def get_game(game_id):
    '''
    Retrieves a Game from the database

    Attr:
        game_id (str): Id of the game to retrieve

    Returns:
        Game object
    '''
    row = db.query_db('SELECT game_id, data  FROM game WHERE game_id = ?',  [game_id], True)
    data = json.loads(row['data'])
    game = Game(data)
    return game

def insert_game(game):
    '''
    Inserts a new Game object to the database

    Attr:
        game (Game): Game object to save
    '''
    db.write_db('INSERT INTO game (game_id, data, time_created, time_completed, time_started) VALUES (?, ?, ?, ?, ?)'
              , [game.game_id, json.dumps(game.as_dict(False)), game.time_created, game.time_completed, game.time_started])

def update_game(game):
    '''
    Updates an existing Game object to the database

    Attr:
        game (Game): Game object to save
    '''
    db.write_db('UPDATE game SET game_id = ?, data = ?, time_completed = ?, time_started = ? WHERE game_id = ?'
              , [game.game_id, json.dumps(game.as_dict(False)), game.time_completed, game.time_started, game.game_id])
    