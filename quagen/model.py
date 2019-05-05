
from time import time

from quagen import db


def create_game(game_id):
    time_created = int(time())
    return write_db('INSERT INTO game (game_id, time_created) VALUES (?, ?)',  [game_id, time_created])

def get_game(game_id):
    return query_db('SELECT game_id, board, dimension_x, dimension_y, player_count, turn_number, time_created, time_completed, time_started FROM game WHERE game_id = ?',  [game_id], True)

def add_player(game_id, player_id):
    return write_db('INSERT INTO game_player (game_id, player_id) VALUES (?, ?)', [game_id, player_id])

def add_move(game_id, player_id, turn_number, board_spot):
    time_created = int(time())
    return write_db('INSERT INTO game_move (game_id, player_id, turn_number, board_spot, time_created) VALUES (?, ?, ?, ?, ?)', [game_id, player_id, turn_number, board_spot, time_created])

def query_db(query, args = (), one = False):

    connection = db.get_db()

    cur = connection.execute(query, args)
    rv = [dict((cur.description[idx][0], value)
               for idx, value in enumerate(row)) for row in cur.fetchall()]
    return (rv[0] if rv else None) if one else rv

def write_db(query, args = (), commit = True):
    
    connection = db.get_db()

    cur = connection.execute(query, args)
    
    if commit:
        connection.commit()

    return cur.lastrowid    