
from time import time

from quagen import db


def create_game(game_id):
    return write_db("INSERT INTO game (game_id, time_created) VALUES (?, ?)",  [game_id, time()])


def write_db(query, args = (), commit = True):
    
    connection = db.get_db()

    cur = connection.execute(query, args)
    
    if commit:
        connection.commit()

    return cur.lastrowid    