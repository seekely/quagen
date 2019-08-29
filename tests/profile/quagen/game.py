"""
Profile game
"""
import cProfile

from quagen.game import Board
from quagen.game import Game


def profile():
    """
    Run profile
    """
    a_board = Board({}, Game.DEFAULT_SETTINGS)
    a_board.generate()
    a_board.apply_moves([[4, 19, 1], [9, 4, 2]])

    def profile_projection():  # pylint: disable=unused-variable
        a_board.calculate_scores()

    cProfile.run("profile_projection()")


if __name__ == "__main__":
    profile()
