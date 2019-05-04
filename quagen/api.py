from flask import Blueprint

import uuid

from quagen import model

bp = Blueprint('api', __name__)

@bp.route('/game')
def get_game():
    return 'Hello game!'


@bp.route('/game/new')
def new_game():
    game_id = str(uuid.uuid4())
    yes = model.create_game(game_id)
    return 'Yes ' + yes