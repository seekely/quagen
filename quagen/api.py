import uuid

from flask import Blueprint
from flask import json
from flask import make_response
from flask import request
from flask import session

from quagen import queries
from quagen.game import Game

bp = Blueprint('api', __name__)

@bp.route('/game/new', methods = ['POST'])
def game_new():

    settings = {
        'ai_count': int(request.values.get('ai_count')),
        'ai_strength': int(request.values.get('ai_strength')),
        'dimension_x': int(request.values.get('board_size')),
        'dimension_y': int(request.values.get('board_size')),
        'player_count': int(request.values.get('player_count')),
        'power': int(request.values.get('power')),
        'pressure': request.values.get('pressure')
    };

    game = Game({'settings': settings})
    game.start()

    queries.insert_game(game)
    queries.insert_game_event(game.game_id, {'type': 'start'})

    return json.jsonify(game = game.as_dict())

@bp.route('/game/<string:game_id>', methods = ['GET'])
def game_view(game_id):
    response = make_response(json.jsonify({'error': 'Not found'}), 404)
    updated_after = int(request.values.get('updatedAfter', 0))

    game = queries.get_game(game_id)
    if None != game:
        game_dict = game.as_dict()

        if game_dict['time_updated'] <= updated_after:
            game_dict = {
                'game_id': game_dict['game_id'],
                'time_updated': game_dict['time_updated']
            }
        else:
            projected_board = game.board.project()
            game_dict['projected'] = projected_board.spots

        response = json.jsonify(game = game_dict)

    return response

@bp.route('/game/<game_id>/move/<int:x>/<int:y>', methods = ['GET', 'POST'])
def game_move(game_id, x, y):
    
    game = queries.get_game(game_id)
    
    if 'player_id' in session.keys():
        player_id = session['player_id']

        event = {
            'type': 'move',
            'player_id': player_id,
            'x': int(x),
            'y': int(y)
        }
        queries.insert_game_event(game_id, event)
        print('Taking turn for player ' + player_id)

    return json.jsonify({'x': x, 'y': y})