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
  
    return render_template('game.html'
                         , game=game)


