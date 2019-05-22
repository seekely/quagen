import random

from quagen.ai import AI
from quagen.utils import chunk_list

class BiasedAI(AI):
    '''
    Much like the ProjectionAI, this primarily relies on selecting X  
    spot candidates from the board and using the projected score to decide the 
    best move. But here, we inject some hand crafted rules and weights 
    when choosing both the candidate spots and best spot. 
     '''

    '''(list) For each strength level, number of spots on the board the AI 
    will randomly glance at to make a move'''
    RANDOM_CANDIDATE_COUNT = [3, 6, 12, 24]

    '''(int) For each strength level, number of spots on the board the AI 
    will look at which are around players' previous moves.'''
    LOOKBACK_CANDIDATE_COUNT = [1, 2, 4, 8]

    '''(int) Number of turns to look back on for previous moves'''
    LOOKBACK_TURNS = 3

    '''(int) Radius around spots to consider for previous moves'''
    LOOKBACK_RADIUS = 2

    '''(list) For each strength level, number of spots from the candidates 
    to also project from the opponents perspective'''
    OPPONENT_PROJECT_COUNT = [1, 2, 4, 8]


    def get_max_strength(self):
        '''
        Returns:
            (int) The max strength / level of this AI
        '''
        return len(BiasedAI.RANDOM_CANDIDATE_COUNT) - 1

    def choose_move(self):
        '''
        Asks the AI to choose a next move given the current state of the 
        game and board. 

        Returns:
            (tuple) Board coordinates in the form of (x, y) 
        '''
        available_spots = self.get_movable_spots()

        # The potential spots we are going to project and ultimately choose from
        candidate_spots = []
        choosen_spot = None

        if 0 == self._game.turn_completed:
            # At the start of the game, we can just choose any spot as they 
            # will all project equally
            random.shuffle(available_spots)
            choosen_spot = available_spots.pop()
        else:
            # Let's look at spots which are around other recent moves. 
            # Doubling down on a recent move or countering an opponent's move 
            # is powerful depending on the board state and stage of the game.
            lookback_count = BiasedAI.LOOKBACK_CANDIDATE_COUNT[self._strength]
            lookback_turns = BiasedAI.LOOKBACK_TURNS
            lookback_radius = BiasedAI.LOOKBACK_RADIUS
            lookback_spots = self._get_lookback_candidates(
                                    available_spots, 
                                    lookback_count,
                                    lookback_turns,
                                    lookback_radius)
            
            candidate_spots += lookback_spots
            available_spots = [spot for spot in available_spots if spot not in candidate_spots]
            
            # All the available spots should be in (x, y) order. We'll divide 
            # up the board into chunks and randomly pick candidates 
            # equally from each chunk. This lets the AI project spots 
            # distributed all over the board without having to look at 
            # every spot.
            random_count = BiasedAI.RANDOM_CANDIDATE_COUNT[self._strength]
            random_spots = self._get_distributed_candidates(available_spots, random_count)

            candidate_spots += random_spots
            available_spots = [spot for spot in available_spots if spot not in candidate_spots]

            # Pick the best of the candidates according to the AI's criteria
            choosen_spot = self._evaluate_candidates(candidate_spots)

        return choosen_spot

    def _get_lookback_candidates(self, available_spots, num_candidates, num_turns, radius):
        '''
        Looks around recent moves made by all players and randomly chooses a 
        handful of available spots

        Args:
            available_spots (list): All spots to choose from 
            num_candidates (int): Number of spots to choose 
            num_turns (int): Number of turns to look back in history
            radius (int): Number of spots around a spot to look

        Returns:
            (list) of choosen candidates
        '''
        candidate_spots = []

        # Grab all spots around recent moves
        lookback_spots = []
        for i in range(num_turns):
            if i < len(self._game.history):
                past_moves = self._game.history[-i]
                for past_move in past_moves:
                    for x in range(-radius, radius + 1):
                        for y in range(-radius, radius + 1):
                            new_move = (past_move[0] + x, past_move[1] + y)                      
                            if new_move in available_spots:
                                lookback_spots.append(new_move)                     

        # Randomly select out the desired count of candidates
        random.shuffle(lookback_spots)
        while (len(candidate_spots) < num_candidates and
               len(lookback_spots) > 0):

            candidate_spots.append(lookback_spots.pop())

        return candidate_spots

    def _get_distributed_candidates(self, available_spots, num_candidates):
        '''
        Randomly chooses spots equally distributed from the available spots
    
        Args:
            available_spots (list): All spots to choose from
            num_candidates (int): Number of spots to choose

        Returns:
            (list) of choosen candidates
        '''
        candidate_spots = []

        # Break up and shuffle the available spots 
        distributed_chunks = chunk_list(available_spots, num_candidates)
        random.shuffle(distributed_chunks)
        for spots in distributed_chunks:
            random.shuffle(spots)
            
        # Grab candidates until we hit spot count or run out of spots.
        i = 0;
        while (len(candidate_spots) < num_candidates and
               len(distributed_chunks) > 0):

                spots = distributed_chunks[i]
                if len(spots) > 0:
                    candidate_spots.append(spots.pop())
                else:
                    del distributed_chunks[i]

                i = (i + 1) if i < (len(distributed_chunks) - 1) else 0

        return candidate_spots

    def _evaluate_candidates(self, candidate_spots):
        '''
        Projects every candidate and chooses the spot with the highest 
        projected score
    
        Args: 
            candidate_spots (list): Spots to evaluate

        Returns:
            (tuple): Spot coordinates as (x, y)

        '''
        best_candidate = None
        best_projection = -1

        for a_move in candidate_spots:
            scores = self.project_move(a_move)
            projected_score = scores[self._color]['projected']
            print('Scored ' + str(a_move) + ' at ' + str(projected_score))

            if projected_score > best_projection:
                best_candidate = a_move
                best_projection = projected_score

        return best_candidate
