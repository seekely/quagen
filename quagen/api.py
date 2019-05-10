import uuid

from flask import Blueprint
from flask import json
from flask import session

from quagen.game import Game
from quagen import queries

bp = Blueprint('api', __name__)

@bp.route('/game/new', methods = ['GET'])
def game_new():
    game = Game()
    game.start()
    queries.insert_game(game)
    return json.jsonify(game=game.as_dict())

@bp.route('/game/<string:game_id>', methods = ['GET'])
def game_view(game_id):
    game = queries.get_game(game_id)
    return json.jsonify(game=game.as_dict())

@bp.route('/game/<string:game_id>/projected', methods = ['GET'])
def game_projected(game_id):
    game = queries.get_game(game_id)
    projected_board = game.board.project()
    return json.jsonify(game={'board': projected_board.spots})

@bp.route('/game/<game_id>/move/<int:x>/<int:y>', methods = ['GET', 'POST'])
def game_move(game_id, x, y):

    game = queries.get_game(game_id)        
    if 'player_id' in session.keys():    
        player_id = session['player_id']
        print('Taking turn for player ' + player_id)
        game.add_player(player_id)
        game.add_move(player_id, int(x), int(y))
        game.process_turn()
        queries.update_game(game)

    return json.jsonify({'x': x, 'y': y})
