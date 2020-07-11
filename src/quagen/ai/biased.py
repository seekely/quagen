"""
Defines a biased/weight AI
"""
import itertools
import logging
import random

from quagen.ai import AI
from quagen.utils import chunk_list


class BiasedAI(AI):
    """
    Selects X candidate spots and chooses the spot with the highest weighted
    score. X is determined by the strength of the AI. While this AI still
    primarily relies on projected score, we bias the AI to look at spots which
    typically produce higher projected scores. This AI will also weigh the
    projected score with other feature of the board state to influence the AI
    to better choose between roughly equal projected scores.
    """

    """(list) For each strength level, number of equally distributed spots on
    the board the AI will consider."""
    DISTRIBUTED_CANDIDATE_COUNT = [3, 12, 24]

    """(int) For each strength level, number of spots on the board the AI
    will look at which are around players' previous moves."""
    LOOKBACK_CANDIDATE_COUNT = [1, 4, 8]

    """(int) Number of turns to look back on for previous moves"""
    LOOKBACK_TURNS = 3

    """(int) Space range away from the center for opening move"""
    OPENING_RADIUS = 3

    def get_max_strength(self):
        """
        Returns:
            (int) The max strength / level of this AI
        """
        return len(BiasedAI.DISTRIBUTED_CANDIDATE_COUNT) - 1

    def choose_move(self):
        """
        Asks the AI to choose a next move given the current state of the
        game and board.

        Returns:
            (tuple) Board coordinates in the form of (x, y)
        """
        available_spots = self.get_movable_spots()
        if not available_spots:
            raise Exception("No available moves for AI to choose from.")

        # The potential spots we are going to project and ultimately choose from
        candidate_spots = []
        choosen_spot = None

        if self._game.turn_completed == 0:
            # At the start of the game, we will choose a random spot towards
            # the middle of the board
            center_x = int(self._game.settings["dimension_x"] / 2)
            pick_x = random.randint(
                center_x - BiasedAI.OPENING_RADIUS, center_x + BiasedAI.OPENING_RADIUS
            )

            center_y = int(self._game.settings["dimension_y"] / 2)
            pick_y = random.randint(
                center_y - BiasedAI.OPENING_RADIUS, center_y + BiasedAI.OPENING_RADIUS
            )

            choosen_spot = (pick_x, pick_y)
        else:
            # Let's look at spots which are around opponents' recent moves.
            # Countering an opponent's move typically has a high projection
            # depending on the board state and stage of the game.
            lookback_count = BiasedAI.LOOKBACK_CANDIDATE_COUNT[self._strength]
            lookback_turns = BiasedAI.LOOKBACK_TURNS
            lookback_spots = self._get_lookback_candidates(
                available_spots, lookback_count, lookback_turns
            )

            candidate_spots += lookback_spots
            available_spots = [
                spot for spot in available_spots if spot not in candidate_spots
            ]

            # All the available spots should be in (x, y) order. We'll divide
            # up the board into chunks and randomly pick candidates
            # equally from each chunk. This lets the AI project spots
            # distributed all over the board without having to look at
            # every spot on the board.
            distributed_count = BiasedAI.DISTRIBUTED_CANDIDATE_COUNT[self._strength]
            distrubted_spots = self._get_distributed_candidates(
                available_spots, distributed_count
            )

            candidate_spots += distrubted_spots
            available_spots = [
                spot for spot in available_spots if spot not in candidate_spots
            ]

            # Pick the best of the candidates according to the AI's criteria
            choosen_spot = self._evaluate_candidates(candidate_spots)

        return choosen_spot

    def _get_lookback_candidates(self, available_spots, num_candidates, num_turns):
        """
        Looks around recent moves made by opponents' and randomly chooses a
        handful of available spots

        Args:
            available_spots (list): All spots to choose from
            num_candidates (int): Number of spots to choose
            num_turns (int): Number of turns to look back in history

        Returns:
            (list) of choosen candidates
        """
        candidate_spots = []

        # Combines all the recent moves into one long list -- exclude moves
        # made by this AI
        past_moves = self._game.history[-num_turns:]
        past_moves = list(itertools.chain.from_iterable(past_moves))
        past_moves = [move for move in past_moves if move[2] != self._color]

        # Select spots immediately surronding each past move
        lookback_spots = []
        for past_move in past_moves:

            for x in range(-1, 2):
                for y in range(-1, 2):
                    spot = (past_move[0] + x, past_move[1] + y)
                    if spot in available_spots:
                        lookback_spots.append(spot)

        # Randomly select out the desired count of candidates
        random.shuffle(lookback_spots)
        while len(candidate_spots) < num_candidates and lookback_spots:
            candidate_spots.append(lookback_spots.pop())

        return candidate_spots

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

        # Augment each selected spot with additional information which will
        # be used to reach a final spot score.
        augmented_candidates = [
            self._augment_candidate(spot) for spot in candidate_spots
        ]

        # Score all the augmented candidates using the augmented fields
        self._score_candidates(augmented_candidates)

        # Choose the highest scoring candidate
        augmented_candidates.sort(key=lambda spot: spot["score"], reverse=True)
        best_candidate = augmented_candidates[0]["coords"]

        for spot in augmented_candidates:
            logging.debug(f"Scored {spot}")

        return best_candidate

    def _augment_candidate(self, spot):
        """
        Augments the candidate spot with additional metadata/information
        gathered from the game/board to help influence the final scoring of
        the spot.

        Args:
            spot (tuple): Spot in the form of (x, y)

        """
        cur_projected = self._game.scores[self._color]["projected"]
        new_projected = self.project_move(spot)[self._color]["projected"]

        augmented_candidate = {
            "coords": spot,
            "projected": new_projected,
            "gain_ai": new_projected - cur_projected,
            "gain_opponents": self._calculate_opponent_gain(spot),
        }

        return augmented_candidate

    def _score_candidates(self, augmented_candidates):
        """
        Using the augmented data for every spot, gives the spot a score.

        Args:
            augmented_candidates (list): Spots augmented with  _augment_candidate

        """
        for spot in augmented_candidates:
            score = spot["gain_ai"]

            # If the AI has the lead, let this AI consider the moves of
            # the opponent to perhaps play defense if the gains for the
            # opponent on a spot are enough to outweight our gains.
            if self._game.is_leading(self._color, "projected"):
                score += spot["gain_opponents"] * 0.34

            spot["score"] = score

    def _calculate_opponent_gain(self, spot):
        """
        Calculates the average gain in projected scoring for each opponent if
        the opponent were to go in the passed spot.

        Args:
            spot: (x, y) spot to evalulate

        Returns:
            (int) Average projected gain for opponents' moving in the spot.
        """
        gain = 0
        player_count = self._game.settings["player_count"]

        for color in range(1, player_count + 1):

            # Only calculate projection for opponent colors
            if color != self._color:

                # The current projected score for the color
                current_score = self._game.scores[color]["projected"]

                # The new projected score after the theoretical move
                projected_score = self.project_move(spot, color)[color]["projected"]

                # What the opponent gained with the theoretical move
                gain += projected_score - current_score

        gain = gain / (player_count - 1)
        return gain
