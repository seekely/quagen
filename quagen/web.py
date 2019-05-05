import uuid

from flask import Blueprint
from flask import render_template
from flask import session

from quagen import model


bp = Blueprint('web', __name__)

@bp.route('/')
def index():
    return 'Hello My World!'

@bp.route('/game/<string:game_id>', methods = ['GET'])
def game_view(game_id):

    game = model.get_game(game_id)
    game['spaces'] = game['dimension_x'] * game['dimension_y']
    if 'player_id' not in session.keys():
        session['player_id'] = uuid.uuid4().hex
    
    if 'game_ids' not in session.keys():
        session['game_ids'] = []

    if game_id not in session['game_ids']:
        model.add_player(game_id, session['player_id'])
        game_ids = session['game_ids'].copy()
        game_ids.append(game_id)
        session['game_ids'] = game_ids

    return render_template('game.html'
                         , game=game)


