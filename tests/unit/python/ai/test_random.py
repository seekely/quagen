import random

from quagen.ai.random import RandomAI
from quagen.game import Game


def test_choose_move():
    """
    We should get known random moves back based on a known seed
    """
    random.seed(42)

    game = Game()
    game.add_player("ai1")
    game.add_player("ai2")
    game.start()

    # Turn 1
    ai1 = RandomAI(game, 1, 0)
    move1 = ai1.choose_move()
    game.add_move("ai1", move1[0], move1[1])
    assert (14, 12) == move1

    ai2 = RandomAI(game, 1, 1)
    move2 = ai2.choose_move()
    game.add_move("ai2", move2[0], move2[1])
    assert (5, 7) == move2

    game.process_turn()

    # Turn 2
    ai1 = RandomAI(game, 1, 0)
    move1 = ai1.choose_move()
    game.add_move("ai1", move1[0], move1[1])
    assert (14, 4) == move1

    ai2 = RandomAI(game, 1, 1)
    move2 = ai2.choose_move()
    game.add_move("ai2", move2[0], move2[1])
    assert (16, 15) == move2

    game.process_turn()
