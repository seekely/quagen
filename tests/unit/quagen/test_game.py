"""
Test game
"""
# pylint: disable=protected-access
import mock

from quagen.game import Board
from quagen.game import Game

##################
##################
#      GAME      #
##################
##################


def test_as_dict():
    """
    Share only information we want to share
    """
    params = {
        "game_id": "1245",
        "turn_completed": 5,
        "turn_moves": {"0": "234", "1": "234"},
        "settings": {"player_count": 3, "power": 6},
    }

    a_game = Game(params)

    # Not shared with client -- internal only
    a_dict = a_game.as_dict(False)
    assert a_dict["game_id"] == "1245"
    assert a_dict["turn_completed"] == 5
    assert {"0": "234", "1": "234"} == a_dict["turn_moves"]
    assert a_dict["settings"]["player_count"] == 3
    assert a_dict["settings"]["power"] == 6

    # Shared with client -- sensitive info held back
    a_dict = a_game.as_dict()
    assert "turn_moves" not in a_dict


@mock.patch("quagen.game.Board.generate")
def test_game_start(mock_generate):
    """
    Assert game has started
    """
    a_game = Game()
    assert a_game.time_started is None
    mock_generate.assert_not_called()

    a_game.start()
    assert a_game.time_started is not None
    mock_generate.assert_called_once()


@mock.patch("quagen.game.Board.generate")
def test_game_start_once(mock_generate):
    """
    Assert game can not start more than once
    """
    a_game = Game()
    a_game.start()
    time_started = a_game.time_started

    a_game.start()
    assert a_game.time_started == time_started
    mock_generate.assert_called_once()


def test_game_end():
    """
    Assert game ends in right state
    """
    a_game = Game()
    a_game.start()
    assert not a_game.completed
    assert a_game.time_completed is None

    a_game.end()
    assert a_game.completed
    assert a_game.time_completed is not None


def test_game_end_once():
    """
    Assert game only ends once
    """
    a_game = Game()
    a_game.start()
    a_game.end()
    time_completed = a_game.time_completed

    a_game.end()
    assert a_game.time_completed == time_completed


def test_game_in_progress():
    """
    Assert game is in progress between start and end
    """
    a_game = Game()
    assert not a_game.is_in_progress()

    a_game.start()
    assert a_game.is_in_progress()

    a_game.end()
    assert not a_game.is_in_progress()


def test_game_add_player():
    """
    Adding players when space still exists
    """

    # Fill up a 2 player game
    a_game = Game()
    a_game.settings["player_count"] = 2
    assert a_game.add_player("player1")
    assert a_game.add_player("player2")
    assert not a_game.add_player("player3")

    # Fill up a 4 player game
    a_game = Game()
    a_game.settings["player_count"] = 4
    assert a_game.add_player("player1")
    assert a_game.add_player("player2")
    assert a_game.add_player("player3")
    assert a_game.add_player("player4")
    assert not a_game.add_player("player5")


def test_game_add_player_not_exists():
    """
    Same player can't be added twice
    """
    a_game = Game()
    a_game.settings["player_count"] = 4

    assert a_game.add_player("duplicate")
    assert not a_game.add_player("duplicate")
    assert a_game.add_player("allgood")


def test_game_is_player():
    """
    Assert verifying players in game
    """
    a_game = Game()
    a_game.add_player("player1")
    a_game.add_player("player2")

    assert a_game.is_player("player1")
    assert a_game.is_player("player2")
    assert not a_game.is_player("player3")
    assert not a_game.is_player("player12")


def test_game_add_move():
    """
    Each player can add a move
    """

    # Fill up 2 moves for player game
    a_game = Game()
    a_game.start()
    a_game.settings["player_count"] = 2
    a_game.add_player("player1")
    a_game.add_player("player2")

    assert a_game.add_move("player1", 3, 4)
    assert a_game.add_move("player2", 4, 5)

    assert a_game._turn_moves["player1"] == [3, 4, 1]
    assert a_game._turn_moves["player2"] == [4, 5, 2]

    # Fill up 4 moves for player game
    a_game = Game()
    a_game.start()
    a_game.settings["player_count"] = 4
    a_game.add_player("player1")
    a_game.add_player("player2")
    a_game.add_player("player3")
    a_game.add_player("player4")

    assert a_game.add_move("player1", 3, 4)
    assert a_game.add_move("player2", 4, 5)
    assert a_game.add_move("player3", 5, 6)
    assert a_game.add_move("player4", 6, 7)

    assert [3, 4, 1] == a_game._turn_moves["player1"]
    assert [4, 5, 2] == a_game._turn_moves["player2"]
    assert [5, 6, 3] == a_game._turn_moves["player3"]
    assert [6, 7, 4] == a_game._turn_moves["player4"]


def test_game_add_move_not_started():
    """
    Player cannot make move when game has not started
    """
    a_game = Game()
    a_game.settings["player_count"] = 2
    a_game.add_player("player1")
    a_game.add_player("player2")

    assert not a_game.add_move("player1", 3, 4)


def test_game_add_move_not_joined():
    """
    Player cannot make move when not part of game
    """
    a_game = Game()
    a_game.start()
    a_game.settings["player_count"] = 2
    a_game.add_player("player1")
    a_game.add_player("player2")

    assert not a_game.add_move("player3", 3, 4)


def test_game_add_move_duplicate():
    """
    Player cannot move twice in one turn
    """
    a_game = Game()
    a_game.start()
    a_game.settings["player_count"] = 2
    a_game.add_player("player1")
    a_game.add_player("player2")

    assert a_game.add_move("player1", 3, 4)
    assert not a_game.add_move("player1", 5, 6)


@mock.patch("quagen.game.Board.validate_move")
def test_game_add_move_invalid(mock_validate_move):
    """
    Player cannot add a invalid move
    """
    mock_validate_move.return_value = False

    a_game = Game()
    a_game.settings["player_count"] = 2
    a_game.add_player("player1")
    a_game.add_player("player2")
    a_game.start()

    assert not a_game.add_move("player1", -1, -1)
    mock_validate_move.assert_called_once()


def test_game_has_moved():
    """
    Assert correct players have moved
    """
    a_game = Game()
    a_game.settings["player_count"] = 2
    a_game.add_player("player1")
    a_game.add_player("player2")
    a_game.start()

    a_game.add_move("player1", 3, 4)

    assert a_game.has_moved("player1")
    assert not a_game.has_moved("player2")
    assert not a_game.has_moved("player12")


def test_game_missing_moves():
    """
    Assert correct players missing moves
    """
    a_game = Game()
    a_game.settings["player_count"] = 3
    a_game.add_player("player1")
    a_game.add_player("player2")
    a_game.add_player("player3")
    a_game.start()

    a_game.add_move("player1", 3, 4)
    a_game.add_move("player3", 3, 4)
    missing = a_game.get_missing_moves()

    assert "player2" in missing
    assert "player1" not in missing
    assert "player3" not in missing


def test_game_missing_moves_short_player():
    """
    Assert we are missing moves when not enough players in game
    """
    a_game = Game()
    a_game.settings["player_count"] = 3
    a_game.add_player("player1")
    a_game.add_player("player2")
    a_game.start()

    a_game.add_move("player1", 3, 4)
    a_game.add_move("player2", 3, 4)
    missing = a_game.get_missing_moves()
    assert "missing_player" in missing
    assert "player3" not in missing

    a_game.add_player("player3")
    missing = a_game.get_missing_moves()
    assert "missing_player" not in missing
    assert "player3" in missing


def test_game_get_leaders():
    """
    Grab the correct leader based on current score
    """
    a_game = Game()

    # Manually hack the scores for test
    a_game._scores = [
        {"controlled": 2},
        {"controlled": 15},
        {"controlled": 2},
        {"controlled": 4},
    ]

    leaders = a_game.get_leaders()
    assert len(leaders) == 1
    assert leaders[0][0] == 1
    assert leaders[0][1] == 15


def test_game_get_leaders_tied():
    """
    Grab the correct leaders based on current score when tie exists
    """
    a_game = Game()

    # Manually hack the scores for test
    a_game._scores = [
        {"controlled": 2},
        {"controlled": 15},
        {"controlled": 2},
        {"controlled": 15},
    ]

    leaders = a_game.get_leaders()
    assert len(leaders) == 2
    assert leaders[0][0] == 1
    assert leaders[0][1] == 15
    assert leaders[1][0] == 3
    assert leaders[1][1] == 15


def test_game_get_leaders_alt_field():
    """
    Grab the correct leader based on projected score
    """
    a_game = Game()

    # Manually hack the scores for test
    a_game._scores = [
        {"controlled": 2, "projected": 1},
        {"controlled": 15, "projected": 1},
        {"controlled": 2, "projected": 17},
        {"controlled": 15, "projected": 2},
    ]

    leaders = a_game.get_leaders("projected")
    assert len(leaders) == 1
    assert leaders[0][0] == 2
    assert leaders[0][1] == 17


def test_game_is_leading():
    """
    Assert player is leading the game
    """
    a_game = Game()

    # Manually hack the scores for test
    a_game._scores = [
        {"controlled": 2, "projected": 1},
        {"controlled": 15, "projected": 1},
        {"controlled": 2, "projected": 17},
        {"controlled": 12, "projected": 2},
    ]

    assert a_game.is_leading(1)
    assert not a_game.is_leading(3)


def test_game_is_leading_tied():
    """
    Assert tied players leading the game
    """
    a_game = Game()

    # Manually hack the scores for test
    a_game._scores = [
        {"controlled": 2, "projected": 1},
        {"controlled": 15, "projected": 1},
        {"controlled": 2, "projected": 17},
        {"controlled": 15, "projected": 2},
    ]

    # Not an outright lead when tied
    assert not a_game.is_leading(1)
    assert not a_game.is_leading(3)

    assert a_game.is_leading(1, outright=False)
    assert a_game.is_leading(3, outright=False)


def test_game_is_leading_alt_field():
    """
    Assert player is projected to lead the game
    """
    a_game = Game()

    # Manually hack the scores for test
    a_game._scores = [
        {"controlled": 2, "projected": 1},
        {"controlled": 15, "projected": 1},
        {"controlled": 2, "projected": 17},
        {"controlled": 12, "projected": 2},
    ]

    assert not a_game.is_leading(1, field="projected")
    assert a_game.is_leading(2, field="projected")


@mock.patch("quagen.game.Board.apply_moves")
@mock.patch("quagen.game.Board.apply_power")
@mock.patch("quagen.game.Board.calculate_scores")
def test_process_turn(mock_calculate_scores, mock_apply_power, mock_apply_moves):
    """
    Process a turn after all players made a move
    """
    a_game = Game()
    a_game.start()
    a_game.settings["player_count"] = 2
    a_game.add_player("player1")
    a_game.add_player("player2")
    a_game.add_move("player1", 1, 1)
    a_game.add_move("player2", 3, 3)

    assert a_game.process_turn()
    assert a_game._turn_completed == 1
    assert {} == a_game._turn_moves
    assert [[[1, 1, 1], [3, 3, 2]]] == a_game._history
    mock_apply_moves.assert_called_once()
    mock_apply_power.assert_called_once()
    mock_calculate_scores.assert_called()


@mock.patch("quagen.game.Board.apply_moves")
@mock.patch("quagen.game.Board.apply_power")
@mock.patch("quagen.game.Board.calculate_scores")
def test_game_process_turn_multiple(
    mock_calculate_scores, mock_apply_power, mock_apply_moves
):
    """
    Process consecutive turns
    """
    a_game = Game()
    a_game.settings["player_count"] = 2
    a_game.add_player("player1")
    a_game.add_player("player2")
    a_game.start()

    # First move
    a_game.add_move("player1", 1, 1)
    a_game.add_move("player2", 3, 3)
    assert a_game.process_turn()

    # Second move
    a_game.add_move("player2", 3, 4)
    a_game.add_move("player1", 5, 9)
    assert a_game.process_turn()
    assert a_game._turn_completed == 2
    assert {} == a_game._turn_moves
    assert [[[1, 1, 1], [3, 3, 2]], [[3, 4, 2], [5, 9, 1]]] == a_game._history
    assert mock_apply_moves.call_count == 2
    assert mock_apply_power.call_count == 2
    mock_calculate_scores.assert_called()


@mock.patch("quagen.game.Board.apply_moves")
def test_game_process_turn_not_in_progress(mock_apply_moves):
    """
    Can't process if game not in progress
    """

    # Not started
    a_game = Game()
    a_game.settings["player_count"] = 3
    a_game.add_player("player1")
    a_game.add_player("player2")
    a_game.add_player("player3")

    a_game.add_move("player1", 1, 1)
    a_game.add_move("player3", 3, 3)
    assert not a_game.process_turn()
    assert a_game._turn_completed == 0
    mock_apply_moves.assert_not_called()

    # Already ended
    a_game = Game()
    a_game.start()
    a_game.settings["player_count"] = 3
    a_game.add_player("player1")
    a_game.add_player("player2")
    a_game.add_player("player3")
    a_game.add_move("player1", 1, 1)
    a_game.add_move("player3", 3, 3)
    a_game.end()

    assert not a_game.process_turn()
    assert a_game._turn_completed == 0
    mock_apply_moves.assert_not_called()


@mock.patch("quagen.game.Board.apply_moves")
def test_game_process_turn_missing_players(mock_apply_moves):
    """
    Can't process turn if all players have not moved
    """
    a_game = Game()
    a_game.start()
    a_game.settings["player_count"] = 3
    a_game.add_player("player1")
    a_game.add_player("player2")
    a_game.add_player("player3")

    a_game.add_move("player1", 1, 1)
    a_game.add_move("player3", 3, 3)
    assert not a_game.process_turn()
    assert a_game._turn_completed == 0
    mock_apply_moves.assert_not_called()

    a_game.add_move("player2", 5, 5)
    assert a_game.process_turn()
    assert a_game._turn_completed == 1
    mock_apply_moves.assert_called_once()


@mock.patch("quagen.game.Game.end")
@mock.patch("quagen.game.Game._check_for_winners")
@mock.patch("quagen.game.Board.apply_moves")
def test_game_process_turn_winner(mock_apply_moves, mock_check_for_winners, mock_end):
    """
    End the game when a winner has been found
    """
    mock_check_for_winners.return_value = True

    a_game = Game()
    a_game.settings["player_count"] = 2
    a_game.add_player("player1")
    a_game.add_player("player2")
    a_game.start()

    a_game.add_move("player1", 1, 1)
    a_game.add_move("player2", 3, 3)
    assert a_game.process_turn()
    mock_apply_moves.assert_called_once()
    mock_end.assert_called_once()


@mock.patch("quagen.game.Board.get_movable_spots")
def test_game_check_winner_no_availability(mock_get_movable_spots):
    """
    Assert a winner exists when no spots are available
    """
    mock_get_movable_spots.return_value = []

    a_game = Game()
    a_game.settings["player_count"] = 2
    a_game.add_player("player1")
    a_game.add_player("player2")
    a_game.start()

    assert a_game._check_for_winners()


def test_game_check_winner_majority():
    """
    Assert a winner exists when a player controls the majority of spots
    """
    a_game = Game()
    a_game.settings["player_count"] = 2
    a_game.add_player("player1")
    a_game.add_player("player2")
    a_game.start()

    # Fudge the scores so we have just under majority
    a_game._scores = [{"controlled": 0}, {"controlled": 199}, {"controlled": 53}]
    assert not a_game._check_for_winners()

    # Fudge the scores so we now have a majority
    a_game._scores = [{"controlled": 0}, {"controlled": 201}, {"controlled": 53}]
    assert a_game._check_for_winners()


@mock.patch("quagen.game.Board.get_movable_spots")
def test_game_check_winner_no_hope(mock_get_movable_spots):
    """
    Assert a winner when no players can catch leader
    """
    mock_get_movable_spots.return_value = [(0, 0), (0, 1), (0, 2)]

    a_game = Game()
    a_game.settings["player_count"] = 3
    a_game.add_player("player1")
    a_game.add_player("player2")
    a_game.add_player("player3")
    a_game.start()

    # Fudge the scores so there are just enough available spots
    a_game._scores = [
        {"controlled": 0},
        {"controlled": 10},
        {"controlled": 8},
        {"controlled": 3},
    ]
    assert not a_game._check_for_winners()

    # Fudge the scores so there are not enough available spots
    a_game._scores = [
        {"controlled": 0},
        {"controlled": 10},
        {"controlled": 4},
        {"controlled": 3},
    ]
    assert a_game._check_for_winners()


##################
##################
#     BOARD      #
##################
##################


def test_board_generate():
    """
    Empty board generates with appropriate dimensions
    """
    settings = {"dimension_x": 34, "dimension_y": 43, "player_count": 2}
    a_board = Board({}, settings)
    a_board.generate()

    assert settings["dimension_x"] == len(a_board.spots)
    assert settings["dimension_y"] == len(a_board.spots[0])
    assert Board.COLOR_NO_PLAYER == a_board.spots[17][13]["color"]
    assert a_board.spots[17][13]["power"] == 0
    assert [0, 0, 0] == a_board.spots[17][13]["pressures"]


def test_validate_move():
    """
    Valid coordinates for moves
    """
    settings = {"dimension_x": 34, "dimension_y": 43, "player_count": 2, "power": 4}
    a_board = Board({}, settings)
    a_board.generate()

    assert a_board.validate_move(0, 0)
    assert a_board.validate_move(33, 42)
    assert a_board.validate_move(17, 13)

    a_board.spots[31][33]["power"] = 3
    assert a_board.validate_move(31, 33)


def test_validate_move_bad_bounds():
    """
    Can't move on spot outside board bounds
    """
    settings = {"dimension_x": 34, "dimension_y": 43, "player_count": 2, "power": 4}
    a_board = Board({}, settings)
    a_board.generate()

    assert not a_board.validate_move(-1, 0)
    assert not a_board.validate_move(0, -1)
    assert not a_board.validate_move(34, 0)
    assert not a_board.validate_move(0, 43)


def test_validate_move_bad_power():
    """
    Can't move on spot at max power
    """
    settings = {"dimension_x": 34, "dimension_y": 43, "player_count": 2, "power": 5}
    a_board = Board({}, settings)
    a_board.generate()

    a_board.spots[31][33]["power"] = 5
    assert not a_board.validate_move(31, 33)

    a_board.spots[31][33]["power"] = 6
    assert not a_board.validate_move(31, 33)

    a_board.spots[31][33]["power"] = 4
    assert a_board.validate_move(31, 33)


def test_apply_moves():
    """
    Players unique moves applied to the board
    """
    settings = {"dimension_x": 34, "dimension_y": 43, "player_count": 4, "power": 5}
    a_board = Board({}, settings)
    a_board.generate()

    moves = [(1, 1, 1), (2, 3, 2), (15, 17, 3), (11, 9, 4)]
    a_board.apply_moves(moves)

    assert a_board.spots[1][1]["color"] == 1
    assert a_board.spots[1][1]["power"] == 5
    assert a_board.spots[2][3]["color"] == 2
    assert a_board.spots[2][3]["power"] == 5
    assert a_board.spots[15][17]["color"] == 3
    assert a_board.spots[15][17]["power"] == 5
    assert a_board.spots[11][9]["color"] == 4
    assert a_board.spots[11][9]["power"] == 5


def test_apply_moves_with_duplicates():
    """
    Players went in the same spot on the board
    """
    settings = {"dimension_x": 34, "dimension_y": 43, "player_count": 4, "power": 5}
    a_board = Board({}, settings)
    a_board.generate()

    # Back to back players go in the same spot
    moves = [(2, 3, 1), (2, 3, 2), (15, 17, 3), (11, 9, 4)]
    a_board.apply_moves(moves)

    assert a_board.spots[2][3]["color"] == Board.COLOR_COLLISION
    assert a_board.spots[2][3]["power"] == 5
    assert a_board.spots[15][17]["color"] == 3
    assert a_board.spots[15][17]["power"] == 5
    assert a_board.spots[11][9]["color"] == 4
    assert a_board.spots[11][9]["power"] == 5

    # Spread out players go in the same spot
    moves = [(4, 4, 1), (5, 19, 2), (3, 6, 3), (5, 19, 4)]
    a_board.apply_moves(moves)

    assert a_board.spots[5][19]["color"] == Board.COLOR_COLLISION
    assert a_board.spots[5][19]["power"] == 5
    assert a_board.spots[4][4]["color"] == 1
    assert a_board.spots[4][4]["power"] == 5
    assert a_board.spots[3][6]["color"] == 3
    assert a_board.spots[3][6]["power"] == 5
