"""
Profile game functions
"""
import cProfile
import time

from quagen.game import Board
from quagen.game import Game


def test_profiles():
    """
    Run game profiles
    """
    print("Profiling score calculation with projection")
    board = Board({}, Game.DEFAULT_SETTINGS)
    board.generate()
    board.apply_moves([[4, 19, 1], [9, 4, 2]])

    profiler = cProfile.Profile()
    profiler.enable()

    start = time.time()
    board.calculate_scores()
    end = time.time()

    profiler.disable()
    profiler.print_stats()

    total_time = end - start
    assert total_time < 0.5


if __name__ == "__main__":
    test_profiles()
