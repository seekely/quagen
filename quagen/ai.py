# Basic version of ai for quagen
import random
import multiprocessing as mp
from copy import deepcopy

from quagen.game import Game

# receive game
def ai_move(live_game, ai_player, ai_strength=2, verbose=False):
    '''
        Received a game id, computes and returns the AI move(s)
        
        Args:
            game_id (str): Id of the game to retrieve
            ai_player (string): name of the ai player, necessary for add_move
            ai_strength (int): strength ai player to be mapped to trees
            verbose (bool): print some extra info

        Returns:
            x, y: Move in the form of (x, y)
    ''' 
    game = deepcopy(live_game)

    # find viable moves
    allowed_spots = game.get_allowed_spots()

    #find_player_id
    ai_int = game._players[ai_player]['color']

    strengths = {
        1: 4, 
        2: 16,
        3: 32
    }

    trees = min(strengths[ai_strength], len(allowed_spots))
    
    
    # prepare parallel processing
    # Define an output queue
    output = mp.Queue()
    if verbose:
        print("Number of processors: ", mp.cpu_count())

    
    # Setup a list of processes that we want to run
    processes = [mp.Process(target=candidate_move, args=(output, game, ai_player, allowed_spots, ai_int)) for x in range(trees)]

    # Run processes
    for p in processes:
        p.start()

    # Exit the completed processes
    for p in processes:
        p.join()

    # Get process results from the output queue
    results = [output.get() for p in processes]
    if verbose:
        print('Moves analyzed with projected scores:', results)
    
    # pick move with the highest projected score
    chosen_move = sorted(results, key=lambda x: x[1], reverse=True)[0]

    if verbose:
        print('AI move:', chosen_move)

    # return moves
    return chosen_move[0][0], chosen_move[0][1]


def candidate_move(output, game, ai_player, allowed_spots, ai_int, verbose=False):
    '''
        Parallel computation of the progected scores to find the best candidate move

        Args:
            output: the output queue
            game: the current game instance
            ai_player (string): name of the ai player, necessary for add_move
            allowed_spots (list): list of (x, y) pairs of allowed moves
            ai_int (int): the number of the ai player, to know which score to read
   
    '''
    
    # a temp game is needed to explore moves
    temp_game = deepcopy(game)
    # randomize moves
    move_pos = random.choice(range(len(allowed_spots)))
    
    # project scores
    temp_game.add_move(ai_player, allowed_spots[move_pos][0], allowed_spots[move_pos][1], log=verbose)
    temp_game._board.apply_moves(list(temp_game._turn_moves.values()))
    temp_game._board.apply_power()
    score = temp_game._board.calculate_scores()[ai_int]['projected']
    
    list_score = (allowed_spots[move_pos], score)
    output.put(list_score)