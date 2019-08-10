"""
Defines a AI which relies on projection
"""
import random

from quagen.ai import AI
from quagen.utils import chunk_list


class ProjectionAI(AI):
    """
    Selects X candidate spots and chooses the spot with the highest
    projected score. X is determined by the strength of the AI. To select
    candidate spots, the AI will divde up the board into equal chunks and
    randomly select a spot from each chunk. This gives the AI a set of
    candidate spots distributed throughout the whole board.
    """

    """(list) For each strength level, number of spots on the board the AI
    will project to select a move"""
    SPOT_CANDIDATE_COUNT = [3, 12, 32]

    def get_max_strength(self):
        """
        Returns:
            (int) The max strength / level of this AI
        """
        return len(ProjectionAI.SPOT_CANDIDATE_COUNT) - 1

    def choose_move(self):
        """
        Asks the AI to choose a next move given the current state of the
        game and board.

        Returns:
            (tuple) Board coordinates in the form of (x, y)
        """
        available_spots = self.get_movable_spots()

        # The potential spots we are going to project and ultimately choose from
        candidate_spots = []
        choosen_spot = None

        if self._game.turn_completed == 0:
            # At the start of the game, we can just choose any spot as they
            # will all project equally
            random.shuffle(available_spots)
            choosen_spot = available_spots.pop()
        else:

            # All the available spots should be in (x, y) order. We'll divide
            # up the board into chunks and randomly pick candidates
            # equally from each chunk. This lets the AI project spots
            # distributed all over the board without having to look at
            # every spot.
            distributed_count = ProjectionAI.SPOT_CANDIDATE_COUNT[self._strength]
            distributed_spots = self._get_distributed_candidates(
                available_spots, distributed_count
            )

            candidate_spots += distributed_spots
            available_spots = [
                spot for spot in available_spots if spot not in candidate_spots
            ]

            # Pick the best of the candidates according to projection
            choosen_spot = self._evaluate_candidates(candidate_spots)

        return choosen_spot

    # pylint: disable=no-self-use
    def _get_distributed_candidates(self, available_spots, num_candidates):
        """
        Randomly chooses spots equally distributed from the available spots

        Args:
            available_spots (list): All spots to choose from
            num_candidates (int): Number of spots to choose

        Returns:
            (list) of choosen candidates
        """
        candidate_spots = []

        # Break up and shuffle the available spots
        distributed_chunks = chunk_list(available_spots, num_candidates)
        random.shuffle(distributed_chunks)
        for spots in distributed_chunks:
            random.shuffle(spots)

        # Grab candidates until we hit spot count or run out of spots.
        i = 0
        while len(candidate_spots) < num_candidates and distributed_chunks:

            spots = distributed_chunks[i]
            if spots:
                candidate_spots.append(spots.pop())
            else:
                del distributed_chunks[i]

            i = (i + 1) if i < (len(distributed_chunks) - 1) else 0

        return candidate_spots

    def _evaluate_candidates(self, candidate_spots):
        """
        Projects every candidate and chooses the spot with the highest
        projected score

        Args:
            candidate_spots (list): Spots to evaluate

        Returns:
            (tuple): Spot coordinates as (x, y)

        """
        best_candidate = None
        best_score = -1

        # Choose the highest scoring candidate
        for spot in candidate_spots:
            scores = self.project_move(spot)
            projected_score = scores[self._color]["projected"]
            print("Scored " + str(spot) + " at " + str(projected_score))

            if projected_score > best_score:
                best_candidate = spot
                best_score = projected_score

        return best_candidate
