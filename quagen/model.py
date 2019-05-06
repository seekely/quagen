
from time import time

from quagen import db


def create_game(game_id):
    time_created = int(time())
    board = '0' * 800
    return write_db('INSERT INTO game (game_id, board, time_created) VALUES (?, ?, ?)',  [game_id, board, time_created])

def get_game(game_id):
    return query_db('SELECT game_id, board, dimension_x, dimension_y, player_count, turn_number, time_created, time_completed, time_started FROM game WHERE game_id = ?',  [game_id], True)

def add_player(game_id, player_id):

    player_found = False
    players = query_db('SELECT player_id FROM game_player WHERE game_id = ?', [game_id])
    for player in players:
        if player['player_id'] == player_id:
            player_found = True
            break

    if not player_found and 2 > len(players):
        player_color = len(players) + 1
        write_db('INSERT INTO game_player (game_id, player_id, player_color) VALUES (?, ?, ?)', [game_id, player_id, player_color])
    else: 
        print('Player already added or game full')
            

def add_move(game_id, player_id, turn_number, spot):

    move_found = False
    moves = query_db('SELECT player_id  FROM game_move WHERE game_id = ? AND turn_number = ?', [game_id, turn_number])
    for move in moves:
        if move['player_id'] == player_id:
            move_found = True
            break

    if not move_found:
        time_created = int(time())
        write_db('INSERT INTO game_move (game_id, player_id, turn_number, spot, time_created) VALUES (?, ?, ?, ?, ?)', [game_id, player_id, turn_number, spot, time_created])
    else:
        print('MOVE ALREADY TAKEN')

    moves = query_db('SELECT m.player_id as player_id, m.spot as spot, p.player_color as player_color  FROM game_move as m LEFT JOIN game_player as p ON m.game_id = p.game_id AND m.player_id = p.player_id  WHERE m.game_id = ? AND m.turn_number = ?', [game_id, turn_number])
    if (2 == len(moves)):
        print('BOTH MOVES RECEIVED')

        game = query_db('SELECT board FROM game WHERE game_id = ?', [game_id], True)
        board = list(game['board'])

        spot_duplicates = {} 
        for move in moves:
            spot = int(move['spot'])
            if spot not in spot_duplicates.keys():
                spot_duplicates[spot] = False
            else:
                spot_duplicates[spot] = True

        for move in moves:
            spot = int(move['spot']) 
            spot_x = spot % 20
            spot_y = int(spot / 20)
            
            if spot_duplicates[spot]:
                print('DUPLICATE DEDICATED')
                board[spot * 2] = str(9)
                board[(spot * 2) + 1] = str(9)
            else:
                updates = [(-1, -1, 1), (0, -1, 2), (1, -1, 1),
                           (-1, 0, 2) , (0, 0, 4) , (1, 0, 2),
                           (-1, 1, 1) , (0, 1, 2) , (1, 1, 1)]

                for update in updates:
                    update_x = spot_x + update[0]
                    update_y = spot_y + update[1]
                    update_spot = ((update_y * 20) + update_x) * 2
                    if update_x >= 0 and update_x < 20 and \
                       update_y >= 0 and update_y < 20:
                        if 4 == update[2] or int(board[update_spot + 1]) == 0:
                            board[update_spot] = str(move['player_color'])
                            board[update_spot + 1] = str(update[2])


        print('BOARD: ' + str(board))
        board = ''.join(board)
        write_db('UPDATE game SET board = ?, turn_number = ? WHERE game_id = ?', [board, turn_number, game_id])


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