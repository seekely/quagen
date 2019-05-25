from copy import deepcopy
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
    RANDOM_CANDIDATE_COUNT = [3, 12, 24]

    '''(int) For each strength level, number of spots on the board the AI 
    will look at which are around players' previous moves.'''
    LOOKBACK_CANDIDATE_COUNT = [1, 4, 8]

    '''(int) Number of turns to look back on for previous moves'''
    LOOKBACK_TURNS = 3

    '''(list) For each strength level, the number of top projected spots the 
    AI will augment with additional information to try and make a better 
    spot choice'''
    AUGMENT_COUNT = [2, 4, 32]

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
            lookback_spots = self._get_lookback_candidates(
                                    available_spots, 
                                    lookback_count,
                                    lookback_turns)
            
            candidate_spots += lookback_spots
            available_spots = [spot for spot in available_spots if spot not in candidate_spots]
            print('Looking at ' + str(lookback_spots))
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

    def _get_lookback_candidates(self, available_spots, num_candidates, num_turns):
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
                    print('Looking at ' + str(past_move))
                    if past_move[2] == self._color:
                        print('Passed on ' + str(past_move))
                        continue

                    for x in range(-1, 2):
                        for y in range(-1, 2):
                            spot = (past_move[0] + x, past_move[1] + y)                      
                            if spot in available_spots:
                                lookback_spots.append(spot)                     

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

    def _get_augment_candidates(self, candidate_spots, num_candidates):
        '''
        Selects the top X candidates for augmentation based on each spot's 
        projected score

        Args:
            candidate_spots (list): Spots to choose from
            num_candidates (int): Number of spots to choose 

        Returns:
            (list) of spots to augment
        ''' 
        augmented_candidates = []
        for spot in candidate_spots:
            cur_projected = self._game.scores[self._color]['projected']
            new_projected = self.project_move(spot)[self._color]['projected']
            
            augmented_candidates.append({
                'coords': spot, 
                'projected': new_projected,
                'gain_ai': new_projected - cur_projected 
            })
             
        augmented_candidates.sort(key = lambda spot: spot['projected'], reverse = True)
        augmented_candidates = augmented_candidates[:num_candidates]

        return augmented_candidates

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
        best_score = -1

        # Project the score for all candidate spots and select the top X 
        # scores for augmentation
        augment_count = BiasedAI.AUGMENT_COUNT[self._strength]
        augmented_candidates = self._get_augment_candidates(candidate_spots, augment_count) 

        # Augment each selected spot with additional information which will 
        # be used to reach a final spot score.
        #(self._augment_candidate(spot) for spot in augmented_candidates)
        for spot in augmented_candidates:
            self._augment_candidate(spot)

        # Score all the augmented candidates using the augmented fields
        self._score_candidates(augmented_candidates)

        # Choose the highest scoring candidate
        for spot in augmented_candidates:        
            augmented_score = spot['score']
            print('Scored ' + str(spot))

            if augmented_score > best_score:
                best_candidate = spot['coords']
                best_score = augmented_score

        return best_candidate

    def _augment_candidate(self, spot):
        '''
        Augments the candidate spot with additional metadata/information 
        gathered from the game/board to help influence the final scoring of 
        the spot.

        Args:
            spot (dict): Spot in the form of {'coords': (x, y), 'projection': 5}
        
        '''
        spot['gain_opponents'] = 0 #self._calculate_opponent_gain(spot['coords'])


    def _score_candidates(self, augmented_candidates):
        '''
        Using the augmented data for every spot, gives the spot a score.

        Args:
            augmented_candidates (list): Spots augmented with  _augment_candidate

        '''
        weights = [
            {'field': 'gain_ai', 'weight': 1, 'max': 0},
            {'field': 'gain_opponents', 'weight': 0, 'max': 0}
        ]

        # Find the max value for every field
        for spot in augmented_candidates:
            for weight in weights:
                weight['max'] = max(weight['max'], spot[weight['field']])
    
        # Give every spot a score by normalizing each field value and 
        # multiplying against the weight
        for spot in augmented_candidates:
            score = 0
            for weight in weights:
                normalized = float(spot[weight['field']]) / max(1, weight['max'])
                score += normalized * weight['weight']

            spot['score'] = score

    def _calculate_opponent_gain(self, spot):
        '''
        Calculates the average gain in projected scoring for each opponent if 
        the opponent were to go in the passed spot.
        
        Args:
            spot: (x, y) spot to evalulate
        
        Returns:
            (int) Average projected gain for opponents' moving in the spot.
        '''
        gain = 0 
        player_count = self._game.settings['player_count']

        for color in range(1, player_count + 1):
            
            # Only calculate projection for opponent colors
            if color != self._color: 

                # The current projected score for the color
                current_score = self._game.scores[color]['projected']

                # The new projected score after the theoretical move
                projected_score = self.project_move(spot, color)[color]['projected']
                
                # What the opponent gained with the theoretical move 
                gain += (projected_score - current_score)

        gain = gain / (player_count - 1)
        return gain