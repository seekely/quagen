from copy import deepcopy
import random

from quagen.ai import AI
from quagen.utils import chunk_list

class ProjectionAI(AI):
    '''
    Randomly selects X candidate spots and chooses the spot with the highest 
    projected score as the move. X is determined by the strength of the AI. 
    '''

    ''' (list) For each strength level, the number of spots on the board the 
            AI will score before choosing a move'''
    SPOT_CANDIDATE_COUNT = [4, 16, 32]

    def get_max_strength(self):
        '''
        Returns:
            (int) The max strength / level of this AI
        '''
        return len(ProjectionAI.SPOT_CANDIDATE_COUNT) - 1

    def choose_move(self):
        '''
        Asks the AI to choose a next move given the current state of the 
        game and board. 

        Returns:
            (tuple) Board coordinates in the form of (x, y) 
        '''
        num_candidates = ProjectionAI.SPOT_CANDIDATE_COUNT[self._strength]
        available_spots = self.get_movable_spots()

        # The spots we are going to project and ultimately choose from
        candidate_spots = []
        choosen_spot = None

        if 0 == self._game.turn_completed:
            # At the start of the game, we can just choose any spot as they 
            # will all project equally
            random.shuffle(available_spots)
            choosen_spot = available_spots.pop()
        else:
            # Randomly pick our candidate spots 
            candidate_spots = self._choose_candidates(available_spots, num_candidates)

            # Pick the best of the candidates
            choosen_spot = self._evaluate_candidates(candidate_spots)

        return choosen_spot


    def _choose_candidates(self, available_spots, num_candidates):
        '''
        Randomly chooses candidate spots from the list of available spots

        Args:
            available_spots (list): Spots to choose from
            num_candidates (int): Number of spots to choose

        Returns:
            (list) of choosen candidates
        '''
        available_spots = deepcopy(available_spots)
        random.shuffle(available_spots)

        candidate_spots = []
        while (len(candidate_spots) < num_candidates and
               len(available_spots) > 0):
            spot = available_spots.pop()
            candidate_spots.append(spot)

        return candidate_spots

    def _evaluate_candidates(self, candidate_spots):
        '''
        Projects every candidate and chooses the spot with the highest 
        projected score.
    
        Args: 
            candidate_spots (list): Spots to evaluate

        Returns:
            (tuple): Spot coordinates as (x, y)

        '''
        best_candidate = None
        best_score = -1

        for spot in candidate_spots:
            scores = self.project_move(spot)
            projected_score = scores[self._color]['projected']
            print('Scored ' + str(spot) + ' at ' + str(projected_score))

            if projected_score > best_score:
                best_candidate = spot
                best_score = projected_score

        return best_candidate
