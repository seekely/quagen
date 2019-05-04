from flask import Blueprint

bp = Blueprint('web', __name__)

@bp.route('/')
def index():
    return 'Hello My World!'

