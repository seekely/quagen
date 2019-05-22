import random

from quagen.ai import AI

class RandomAI(AI):
    '''
    Literally picks a random spot to move. More useful for benchmarking other 
    AIs than used against a human in a real game.
    '''
    def get_max_strength(self):
        '''
        Returns:
            (int) The max strength / level of this AI
        '''
        return 0

    def choose_move(self):
        '''
        Asks the AI to choose a next move given the current state of the 
        game and board. 

        Returns:
            (tuple) Board coordinates in the form of (x, y) 
        '''
        valid_moves = self.get_valid_moves()
        random.shuffle(valid_moves)
        return valid_moves.pop()
