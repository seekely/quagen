import random

from quagen.ai import AI
from quagen.utils import chunk_list

class ProjectionAI(AI):
    '''
    Randomly selects X move candidates and chooses the spot with the highest 
    projected score as the move. X is determined by the strength of the AI. 
    '''

    ''' (list) For each strength level, the number of spots on the board the 
             AI will score before choosing a move'''
    MOVE_CANDIDATE_COUNT = [4, 8, 16, 32]

    def get_max_strength(self):
        '''
        Returns:
            (int) The max strength / level of this AI
        '''
        return len(ProjectionAI.MOVE_CANDIDATE_COUNT) - 1

    def choose_move(self):
        '''
        Asks the AI to choose a next move given the current state of the 
        game and board. 

        Returns:
            (tuple) Board coordinates in the form of (x, y) 
        '''
        spot_count = ProjectionAI.MOVE_CANDIDATE_COUNT[self._strength]
        valid_moves = self.get_valid_moves()

        # The potential moves we are going to project and ultimately choose from
        candidate_moves = []

        # Keep grabbing candidates until we have our spot count or have run 
        # out of moves.
        random.shuffle(valid_moves)
        while (len(candidate_moves) < spot_count and
               len(valid_moves) > 0):

                a_move = valid_moves.pop()
                candidate_moves.append(a_move)

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

