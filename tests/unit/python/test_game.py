import mock

from quagen.game import Board
from quagen.game import Game

##################
##################
#      GAME      #
##################
##################

def test_as_dict():
    '''
    Share only information we want to share
    '''
    params = {
        'game_id': '1245',
        'turn_completed': 5,
        'turn_moves': {'0': '234', '1': '234'},
        'settings': {
            'player_count': 3,
            'power': 6
        }
    }
    
    a_game = Game(params)

    # Not shared with client -- internal only 
    a_dict = a_game.as_dict(False)
    assert '1245' == a_dict['game_id']
    assert 5 == a_dict['turn_completed']
    assert {'0': '234', '1': '234'} == a_dict['turn_moves']
    assert 3 == a_dict['settings']['player_count']
    assert 6 == a_dict['settings']['power']

    # Shared with client -- sensitive info held back
    a_dict = a_game.as_dict()
    assert 'turn_moves' not in a_dict

@mock.patch('quagen.game.Board.generate')
def test_game_start(mock_generate):
    ''' 
    Assert game has started
    '''
    a_game = Game()
    assert a_game.time_started is None
    mock_generate.assert_not_called()

    a_game.start()
    assert a_game.time_started is not None
    mock_generate.assert_called_once()

def test_game_add_player():
    '''
    Adding players when space still exists
    '''

    # Fill up a 2 player game 
    a_game = Game()
    a_game.settings['player_count'] = 2
    assert a_game.add_player('player1')
    assert a_game.add_player('player2')
    assert not a_game.add_player('player3')

    # Fill up a 4 player game
    a_game = Game()
    a_game.settings['player_count'] = 4
    assert a_game.add_player('player1')
    assert a_game.add_player('player2')
    assert a_game.add_player('player3')
    assert a_game.add_player('player4')
    assert not a_game.add_player('player5')

def test_game_add_player_not_exists():
    '''
    Same player can't be added twice
    '''
    a_game = Game()
    a_game.settings['player_count'] = 4
    assert a_game.add_player("duplicate")
    assert not a_game.add_player("duplicate")
    assert a_game.add_player("allgood")

def test_game_add_move():
    '''
    Each player can add a move
    '''

    # Fill up 2 moves for player game
    a_game = Game()
    a_game.start()
    a_game.settings['player_count'] = 2
    a_game.add_player('player1')
    a_game.add_player('player2')

    assert a_game.add_move('player1', 3, 4)
    assert a_game.add_move('player2', 4, 5)

    assert [3, 4, 1] == a_game._turn_moves['player1']
    assert [4, 5, 2] == a_game._turn_moves['player2']

    # Fill up 4 moves for player game
    a_game = Game()
    a_game.start()
    a_game.settings['player_count'] = 4
    a_game.add_player('player1')
    a_game.add_player('player2')
    a_game.add_player('player3')
    a_game.add_player('player4')

    assert a_game.add_move('player1', 3, 4)
    assert a_game.add_move('player2', 4, 5)
    assert a_game.add_move('player3', 5, 6)
    assert a_game.add_move('player4', 6, 7)

    assert [3, 4, 1] == a_game._turn_moves['player1']
    assert [4, 5, 2] == a_game._turn_moves['player2']
    assert [5, 6, 3] == a_game._turn_moves['player3']
    assert [6, 7, 4] == a_game._turn_moves['player4']


def test_game_add_move_not_started():
    '''
    Player cannot make move when game has not started
    '''
    a_game = Game()
    a_game.settings['player_count'] = 2
    a_game.add_player('player1')
    a_game.add_player('player2')

    assert not a_game.add_move('player1', 3, 4)

def test_game_add_move_not_joined():
    '''
    Player cannot make move when not part of game
    '''
    a_game = Game()
    a_game.start()
    a_game.settings['player_count'] = 2
    a_game.add_player('player1')
    a_game.add_player('player2')

    assert not a_game.add_move('player3', 3, 4)

def test_game_add_move_duplicate():
    '''
    Player cannot move twice in one turn
    '''
    a_game = Game()
    a_game.start()
    a_game.settings['player_count'] = 2
    a_game.add_player('player1')
    a_game.add_player('player2')

    assert a_game.add_move('player1', 3, 4)
    assert not a_game.add_move('player1', 5, 6)

@mock.patch('quagen.game.Board.validate_move')
def test_game_add_move_invalid(mock_validate_move):
    '''
    Player cannot add a invalid move
    '''
    mock_validate_move.return_value = False

    a_game = Game()
    a_game.start()
    a_game.settings['player_count'] = 2
    a_game.add_player('player1')
    a_game.add_player('player2')

    assert not a_game.add_move('player1', -1, -1)
    mock_validate_move.assert_called_once()

@mock.patch('quagen.game.Board.apply_moves')
@mock.patch('quagen.game.Board.apply_power')
@mock.patch('quagen.game.Board.calculate_scores')
def test_process_turn(mock_calculate_scores, mock_apply_power, mock_apply_moves):
    '''
    Process a turn after all players made a move
    '''
    a_game = Game()
    a_game.start()
    a_game.settings['player_count'] = 2
    a_game.add_player('player1')
    a_game.add_player('player2')
    a_game.add_move('player1', 1, 1)
    a_game.add_move('player2', 3, 3)

    assert a_game.process_turn()
    assert a_game._turn_completed == 1
    assert {} == a_game._turn_moves
    assert [[[1, 1, 1], [3, 3, 2]]] == a_game._history
    mock_apply_moves.assert_called_once()
    mock_apply_power.assert_called_once()
    mock_calculate_scores.assert_called()

@mock.patch('quagen.game.Board.apply_moves')
@mock.patch('quagen.game.Board.apply_power')
@mock.patch('quagen.game.Board.calculate_scores')
def test_process_turn_multiple(mock_calculate_scores, mock_apply_power, mock_apply_moves):
    '''
    Process consecutive turns
    '''
    a_game = Game()
    a_game.start()
    a_game.settings['player_count'] = 2
    a_game.add_player('player1')
    a_game.add_player('player2')

    # First move
    a_game.add_move('player1', 1, 1)
    a_game.add_move('player2', 3, 3)
    assert a_game.process_turn()

    # Second move 
    a_game.add_move('player2', 3, 4)
    a_game.add_move('player1', 5, 9)
    assert a_game.process_turn()
    assert a_game._turn_completed == 2
    assert {} == a_game._turn_moves
    assert [
            [[1, 1, 1], [3, 3, 2]],
            [[3, 4, 2], [5, 9, 1]]
           ] == a_game._history
    assert 2 == mock_apply_moves.call_count
    assert 2 == mock_apply_power.call_count
    mock_calculate_scores.assert_called()

@mock.patch('quagen.game.Board.apply_moves')
def test_process_turn_missing_players(mock_apply_moves):
    '''
    Can't process turn if all players have not moved
    '''
    a_game = Game()
    a_game.start()
    a_game.settings['player_count'] = 3
    a_game.add_player('player1')
    a_game.add_player('player2')
    a_game.add_player('player3')
    
    a_game.add_move('player1', 1, 1)
    a_game.add_move('player3', 3, 3)
    assert not a_game.process_turn()
    assert a_game._turn_completed == 0
    mock_apply_moves.assert_not_called()

    a_game.add_move('player2', 5, 5)
    assert a_game.process_turn()
    assert a_game._turn_completed == 1
    mock_apply_moves.assert_called_once()

##################
##################
#     BOARD      #
##################
##################

def test_board_generate():
    ''' 
    Empty board generates with appropriate dimensions
    '''
    settings = {
        'dimension_x':  34,
        'dimension_y':  43,
        'player_count': 2
    }
    a_board = Board({}, settings)
    a_board.generate()

    assert settings['dimension_x'] == len(a_board.spots)
    assert settings['dimension_y'] == len(a_board.spots[0])
    assert Board.COLOR_NO_PLAYER == a_board.spots[17][13]['color']
    assert 0 == a_board.spots[17][13]['power']
    assert [0, 0, 0] == a_board.spots[17][13]['pressures']

def test_validate_move():
    '''
    Valid coordinates for moves
    '''
    settings = {
        'dimension_x':  34,
        'dimension_y':  43,
        'player_count': 2,
        'power': 4
    }
    a_board = Board({}, settings)
    a_board.generate()

    assert a_board.validate_move(0, 0)
    assert a_board.validate_move(33, 42)
    assert a_board.validate_move(17, 13)

    a_board.spots[31][33]['power'] = 3
    assert a_board.validate_move(31, 33)

def test_validate_move_bad_bounds():
    '''
    Can't move on spot outside board bounds
    '''
    settings = {
        'dimension_x':  34,
        'dimension_y':  43,
        'player_count': 2,
        'power': 4
    }
    a_board = Board({}, settings)
    a_board.generate()

    assert not a_board.validate_move(-1, 0)
    assert not a_board.validate_move(0, -1)
    assert not a_board.validate_move(34, 0)
    assert not a_board.validate_move(0, 43)

def test_validate_move_bad_power():
    '''
    Can't move on spot at max power
    ''' 
    settings = {
        'dimension_x':  34,
        'dimension_y':  43,
        'player_count': 2,
        'power': 5
    }
    a_board = Board({}, settings)
    a_board.generate()

    a_board.spots[31][33]['power'] = 5
    assert not a_board.validate_move(31, 33)

    a_board.spots[31][33]['power'] = 6
    assert not a_board.validate_move(31, 33)

    a_board.spots[31][33]['power'] = 4
    assert a_board.validate_move(31, 33)

def test_apply_moves():
    '''
    Players unique moves applied to the board
    '''
    settings = {
        'dimension_x':  34,
        'dimension_y':  43,
        'player_count': 4,
        'power': 5
    }
    a_board = Board({}, settings)
    a_board.generate()

    moves = [(1, 1, 1), (2, 3, 2), (15, 17, 3), (11, 9, 4)]
    a_board.apply_moves(moves)    

    assert a_board.spots[1][1]['color'] == 1
    assert a_board.spots[1][1]['power'] == 5
    assert a_board.spots[2][3]['color'] == 2
    assert a_board.spots[2][3]['power'] == 5
    assert a_board.spots[15][17]['color'] == 3
    assert a_board.spots[15][17]['power'] == 5
    assert a_board.spots[11][9]['color'] == 4
    assert a_board.spots[11][9]['power'] == 5

def test_apply_moves_with_duplicates():
    '''
    Players went in the same spot on the board 
    '''
    settings = {
        'dimension_x':  34,
        'dimension_y':  43,
        'player_count': 4,
        'power': 5
    }
    a_board = Board({}, settings)
    a_board.generate()

    # Back to back players go in the same spot
    moves = [(2, 3, 1), (2, 3, 2), (15, 17, 3), (11, 9, 4)]
    a_board.apply_moves(moves)    

    assert a_board.spots[2][3]['color'] == Board.COLOR_COLLISION
    assert a_board.spots[2][3]['power'] == 5
    assert a_board.spots[15][17]['color'] == 3
    assert a_board.spots[15][17]['power'] == 5
    assert a_board.spots[11][9]['color'] == 4
    assert a_board.spots[11][9]['power'] == 5

    # Spread out players go in the same spot
    moves = [(4, 4, 1), (5, 19, 2), (3, 6, 3), (5, 19, 4)]
    a_board.apply_moves(moves)    

    assert a_board.spots[5][19]['color'] == Board.COLOR_COLLISION
    assert a_board.spots[5][19]['power'] == 5
    assert a_board.spots[4][4]['color'] == 1
    assert a_board.spots[4][4]['power'] == 5
    assert a_board.spots[3][6]['color'] == 3
    assert a_board.spots[3][6]['power'] == 5
