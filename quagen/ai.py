from copy import deepcopy
import random

from quagen.game import Game
from quagen.utils import chunk_list

'''(int) Number of AI strength levels available'''
AI_MAX_STRENGTH = 4

'''(list) Number of spots on the board the AI will randomly glance at to make 
a move for each AI strength level'''
AI_SPOT_CANDIDATES = [3, 6, 12, 24]

'''(int) Number of turns to pick from opponent's previous moves based on 
AI strength.'''
AI_LOOKBACK_CANDIDATES = [1, 2, 4, 8]

'''(int) Number of turns to look back to examine opponent's moves'''
AI_LOOKBACK_TURNS = 3

'''(int) Radius around opponent spots to consider for counter move'''
AI_LOOKBACK_RADIUS = 2

'''(int) What the AI considers early game to influence decision making'''
AI_EARLY_TURNS = 4

'''(int) Minimum spacing from the edge in early game'''
AI_EARLY_SPACING = 3

def choose_move(game, color, strength = AI_MAX_STRENGTH):
    '''
    Decides on a move to make for an AI player or player looking for 
    assistance.

    Args:
        game (Game): Instance of game being played 
        color (int): Color of the player the AI makes a choice for
        strength (int): Higher strength makes the choosen move smarter

    Return:
        (tuple) Coordinates of the choosen move in the form of (x, y)
    '''

    valid_moves = game.board.get_valid_moves()
    #print('All valid moves ' + str(valid_moves))

    candidate_moves = []
    # Let's start by grabbing random spots around the recent moves. 
    # Doubling down on a recent move or countering an opponent's move might 
    # be powerful.
    counter_moves = []
    for i in range(AI_LOOKBACK_TURNS):
        if i < len(game.history):
            turn_moves = game.history[-i]
            for turn_move in turn_moves:
                for x in range(-AI_LOOKBACK_RADIUS, AI_LOOKBACK_RADIUS + 1):
                    for y in range(-AI_LOOKBACK_RADIUS, AI_LOOKBACK_RADIUS + 1):                     
                        counter_moves.append((turn_move[0] + x, turn_move[1] + y))                     

    print('Possible counter moves ' + str(counter_moves))

    spot_count = AI_LOOKBACK_CANDIDATES[strength]
    random.shuffle(counter_moves)
    chance_odds = 25
    chance_num = random.randint(0, 100)
    while (len(candidate_moves) < spot_count and
           0 < len(counter_moves)):
        a_move = counter_moves.pop()

        if a_move in valid_moves:
            valid_moves.remove(a_move)    
        
            if chance_num > chance_odds:
                print('Added ' + str(a_move) + ' as candidate move')
                candidate_moves.append(a_move)
    

    # In the early game, we are going to throw out any spots too close to the 
    # edge as these are almost guarenteed to be too weak/boneheaded.
    print('There are ' + str(len(valid_moves)) + ' valid moves for early turn removal')
    if AI_EARLY_TURNS >= game.turn_completed:
        max_x = game.settings['dimension_x']
        max_y = game.settings['dimension_y']
        for a_move in deepcopy(valid_moves):
            if (a_move[0] < AI_EARLY_SPACING or
               (max_x - a_move[0] - 1) < AI_EARLY_SPACING or
               a_move[1] < AI_EARLY_SPACING or
               (max_y - a_move[1] - 1) < AI_EARLY_SPACING):

                valid_moves.remove(a_move)

    # From the remaining valid moves, pick a set of "random" spots to further 
    # examine based on the AI strength. It's "random" because we are going to 
    # try and look at many areas of the board and not just accidentally look 
    # at a bunch of adjacent moves.
    spot_count = AI_SPOT_CANDIDATES[strength]
    if spot_count > len(valid_moves):
        print('All spots remaining are candidates.')
        candidate_moves += valid_moves
    else:
        random_moves = []
        chunks = chunk_list(valid_moves, spot_count)
        random.shuffle(chunks)

        print('We have chunks ' + str(chunks))

        cur_chunk = 0
        while (len(random_moves) < spot_count):
            if len(chunks[cur_chunk]) > 0:
                random_moves.append(chunks[cur_chunk].pop())

            cur_chunk += 1
            if cur_chunk >= len(chunks):
                cur_chunk = 0

        candidate_moves += random_moves

    print('Candidates selected: ' + str(candidate_moves))

    # Now choose the best candidate
    best_candidate = None
    best_projection = -1

    for a_move in candidate_moves:
       color_move = (a_move[0], a_move[1], color)

       a_board = deepcopy(game.board)
       a_board.apply_moves([color_move])
       projected_score = a_board.calculate_scores()

       print('Move at ' + str(a_move) + ' projected at ' + str(projected_score[color]['projected']))

       if projected_score[color]['projected'] > best_projection:
            best_candidate = a_move
            best_projection = projected_score[color]['projected']

    return best_candidate
