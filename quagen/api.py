import uuid

from flask import Blueprint
from flask import jsonify
from flask import session

from quagen import model


bp = Blueprint('api', __name__)

@bp.route('/game/new', methods = ['GET'])
def game_new():
    game_id = uuid.uuid4().hex
    yes = model.create_game(game_id)
    return 'Yes ' + game_id

@bp.route('/game/<string:game_id>', methods = ['GET'])
def game_view(game_id):
    game = model.get_game(game_id)
    return jsonify(game=game)

@bp.route('/game/<game_id>/move/<int:spot>', methods = ['GET', 'POST'])
def game_move(game_id, spot):
    game = model.get_game(game_id)
    if 'player_id' not in session.keys():
        session['player_id'] = uuid.uuid4().hex
    
    if 'game_ids' not in session.keys():
        session['game_ids'] = []

    if game_id not in session['game_ids']:
        model.add_player(game_id, session['player_id'])
        game_ids = session['game_ids'].copy()
        game_ids.append(game_id)
        session['game_ids'] = game_ids

    model.add_move(game_id, session['player_id'], game['turn_number'] + 1, spot)
    return 'Move made!' + str(spot)

