import random

from quagen.ai import AI
from quagen.utils import chunk_list

class BiasedAI(AI):
    '''
    Much like the ProjectionAI, this primarily relies on selecting X move 
    candidates from the board and using the projected score to choose the 
    ultimate best move. The difference being the biased AI spends a bit 
    more time selecting which potential moves get added to the candidates pile 
    and tweaking the  projection scores based on custom weighting.
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
        valid_moves = self.get_valid_moves()

        # The potential moves we are going to project and ultimately choose from
        candidate_moves = []

        # Let's start by grabbing random spots around the recent moves. 
        # Doubling down on a recent move or countering an opponent's move might 
        # be powerful.
        spot_count = BiasedAI.LOOKBACK_CANDIDATE_COUNT[self._strength]
        lookback_moves = []
        lookback_turns = BiasedAI.LOOKBACK_TURNS
        lookback_radius = BiasedAI.LOOKBACK_RADIUS

        for i in range(lookback_turns):
            if i < len(self._game.history):
                past_moves = self._game.history[-i]
                for past_move in past_moves:
                    for x in range(-lookback_radius, lookback_radius + 1):
                        for y in range(-lookback_radius, lookback_radius + 1):                     
                            lookback_moves.append((past_move[0] + x, past_move[1] + y))                     

        random.shuffle(lookback_moves)
        while (len(candidate_moves) < spot_count and
               len(lookback_moves) > 0):

            a_move = lookback_moves.pop()
            if a_move in valid_moves:
                valid_moves.remove(a_move)    
                candidate_moves.append(a_move)
    
        # All the valid moves should be returned to us in the same order 
        # they are visually on the board. We'll divide up the board into 
        # chunks equal to the number of spots we are going to examine. This 
        # effectively evenly distributes the moves we will look at, and lets 
        # the AI have a chance at projecting the whole of the board rather 
        # than randomly focusing on one section.    
        spot_count = BiasedAI.RANDOM_CANDIDATE_COUNT[self._strength]
        random_moves = []
        distributed_moves = chunk_list(valid_moves, spot_count)
        
        # Shuffle the chunks so we have less bias to looking at one part of 
        # the board should the lists be unequal in size. 
        random.shuffle(distributed_moves)
        for a_chunk in distributed_moves:
            random.shuffle(a_chunk)

        # Keep grabbing candidates until we have our spot count or have run 
        # out of moves.
        i = 0;
        while (len(random_moves) < spot_count and
               len(valid_moves) > 0):

            a_chunk = distributed_moves[i]
            if len(a_chunk) > 0:
                a_move = a_chunk.pop()

                random_moves.append(a_move)
                valid_moves.remove(a_move)

            i = (i + 1) if i < (len(distributed_moves) - 1) else 0

        candidate_moves += random_moves

        # Now choose the best move by projecting each of the candidates and 
        # picking the move with the highest score.
        best_candidate = None
        best_projection = -1

        for a_move in candidate_moves:
            scores = self.project_move(a_move)
            projected_score = scores[self._color]['projected']
            print('Scored ' + str(a_move) + ' at ' + str(projected_score))

            if projected_score > best_projection:
                best_candidate = a_move
                best_projection = projected_score

        return best_candidate
