import uuid

from flask import Blueprint
from flask import json
from flask import make_response
from flask import request
from flask import session

from quagen.game import Game
from quagen import queries
from quagen import ai

bp = Blueprint('api', __name__)

@bp.route('/game/new', methods = ['POST'])
def game_new():

    settings = {
        'dimension_x': int(request.values.get('board_size')),
        'dimension_y': int(request.values.get('board_size')),
        'player_count': int(request.values.get('player_count')),
        'power': int(request.values.get('power')),
        'pressure': request.values.get('pressure'),
        'ai_in_play': int(request.values.get('ai_in_play'))
    };
    # BECAUSE 60x60 broke things for now
    settings['dimension_x'] = 20
    settings['dimension_y'] = 20

    game = Game({'settings': settings})
    game.start()

    # add the AI player right away
    if settings['ai_in_play']:
        ai_player = 'AI'
        game.add_player(ai_player)
        #init at turn 0
        game._settings['ai_last_turn'] = 0

    queries.insert_game(game)
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
    ai_in_play = game._settings['ai_in_play'] 
    
    if 'player_id' in session.keys():
        player_id = session['player_id']
        print('Taking turn for player ' + player_id)
        game.add_player(player_id)
        
        # hack so that AI plays only the first time
        if ai_in_play and game._settings['ai_last_turn'] == game._turn_completed:
            ai_strength = game._settings['ai_in_play']
            ai_player = 'AI'
            print('Taking turn for player ' + ai_player, 'strength', ai_strength)
            ai_x, ai_y = ai.ai_move(game, ai_player, ai_strength, verbose=False)
            game.add_move(ai_player, ai_x, ai_y)
            game._settings['ai_last_turn'] += 1
        
        # add_move needs to be after the AI move otherwise the projection uses it
        game.add_move(player_id, int(x), int(y))
        game.process_turn()
        queries.update_game(game)

    return json.jsonify({'x': x, 'y': y})