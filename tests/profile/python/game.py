import cProfile
import os
import sys

sys.path.append(os.getcwd())

from quagen.game import Board
from quagen.game import Game

a_board = Board({}, Game.DEFAULT_SETTINGS)
a_board.generate()
a_board.apply_moves([[4, 19, 1], [9, 4, 2]])


def profile_projection():
    a_board.calculate_scores()


cProfile.run("profile_projection()")
