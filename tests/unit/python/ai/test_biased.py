import random

from quagen.ai.biased import BiasedAI
from quagen.game import Game

def test_choose_move():
    '''
    We should get known random moves back based on a known seed
    '''
    random.seed(42)

    game = Game()
    game.add_player('ai1')
    game.add_player('ai2')
    game.start()

    # Add a few scattered moves before running the ai/projections
    seed_moves = [
        [(13, 17), (19, 13)],
        [(17, 13), (5, 5)],
        [(8, 8), (11, 4)]
    ]
    for seed_move in seed_moves:
        game.add_move('ai1', seed_move[0][0], seed_move[0][1])
        game.add_move('ai2', seed_move[1][0], seed_move[1][1])
        game.process_turn()

    # AI move 1
    ai1 = BiasedAI(game, 1, 0)
    move1 = ai1.choose_move()
    game.add_move('ai1', move1[0], move1[1])
    assert (18, 11) == move1

    ai2 = BiasedAI(game, 1, 1)
    move2 = ai2.choose_move()
    game.add_move('ai2', move2[0], move2[1])
    assert (12, 7) == move2

    game.process_turn()

    # AI move 2
    ai1 = BiasedAI(game, 1, 0)
    move1 = ai1.choose_move()
    game.add_move('ai1', move1[0], move1[1])
    assert (15, 3) == move1

    ai2 = BiasedAI(game, 1, 1)
    move2 = ai2.choose_move()
    game.add_move('ai2', move2[0], move2[1])
    assert (15, 7) == move2

    game.process_turn()
