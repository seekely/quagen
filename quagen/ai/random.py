"""
Defines an AI which picks randomly
"""
import random

from quagen.ai import AI


class RandomAI(AI):
    """
    Literally picks a random spot to move. More useful for benchmarking other
    AIs than used against a human in a real game.
    """

    def get_max_strength(self):
        """
        Returns:
            (int) The max strength / level of this AI
        """
        return 0

    def choose_move(self):
        """
        Asks the AI to choose a next move given the current state of the
        game and board.

        Returns:
            (tuple) Board coordinates in the form of (x, y)
        """
        available_spots = self.get_movable_spots()
        random.shuffle(available_spots)
        return available_spots.pop()
