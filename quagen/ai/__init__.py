from abc import ABCMeta
from abc import abstractmethod
from copy import deepcopy

class AI(object, metaclass=ABCMeta):
    '''
    A base class for all AI approaches
    '''

    '''(int) To avoid the AI making a very dumb move early, minimum x and y 
    spacing from the board edge in early game'''
    EARLY_SPACING = 3

    '''(int) Number of turns the AI considers early game'''
    EARLY_TURNS = 3


    def __init__(self, game, color, strength):
        self._game = game
        self._color = color
        self._strength = min(strength, self.get_max_strength())

    @abstractmethod
    def choose_move(self):
        '''
        Asks the AI to choose a next move given the current state of the 
        game and board. 

        Returns:
            (tuple) Board coordinates in the form of (x, y) 
        '''
        pass

    @abstractmethod
    def get_max_strength(self):
        '''
        Returns:
            (int) The max strength / level of this AI
        '''
        pass 

    def project_move(self, move):
        '''
        Provides the projected scores for a move on the board
        
        Args:
            move (tuple): Spot coordinates in the form of (x, y) 

        Returns:
            (list): Scores of the projected game with the move in place. 
        '''

        # We need to copy the board since we are adding a move to the game and 
        # do not want to affect the real/original game.
        projected_move = (move[0], move[1], self._color)
        projected_board = deepcopy(self._game.board)
        projected_board.apply_moves([projected_move])

        return projected_board.calculate_scores()


    def get_valid_moves(self):
        ''' 
        Provides a list of valid moves for the AI to make after some simple 
        filtering.

        Returns:
            (list) of (x,y) tuples.

        '''        
        valid_moves = self._game.board.get_valid_moves()

        # Removes moves too close to the edge in early game.
        self._filter_edge_moves(valid_moves)

        return valid_moves

    def _filter_edge_moves(self, valid_moves):
        '''
        Playing a move near the edge in the early game is really weak and 
        makes the AI look dumb. We'll avoid those edge moves in the first few
        turns even if the AI thinks they look promising.
        '''

        if self._game.turn_completed < AI.EARLY_TURNS:
            max_x = self._game.settings['dimension_x']
            max_y = self._game.settings['dimension_y']
            
            for a_move in deepcopy(valid_moves):

                if (a_move[0] < AI.EARLY_SPACING or
                   (max_x - a_move[0] - 1) < AI.EARLY_SPACING or
                   a_move[1] < AI.EARLY_SPACING or
                   (max_y - a_move[1] - 1) < AI.EARLY_SPACING):

                    valid_moves.remove(a_move)

