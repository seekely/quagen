from quagen.game import Game

class Simulation:
    '''
    Simulates AI opponents against on another in a game
    '''

    def __init__(self, game):
        self._game = game
        self._ai_players = []

    def add_player(self, ai_player):
        ai_name = ai_player.__class__.__name__ + '_' + str(len(self._ai_players))
        self._ai_players.append((ai_name, ai_player))
        self._game.add_player(ai_name)

    def run(self):

        self._game.start()
        while (0 < len(self._game.board.get_valid_moves())):
            for ai_player in self._ai_players:
                ai_name = ai_player[0]
                ai_logic = ai_player[1]

                a_move = ai_logic.choose_move()
                game.add_move(ai_name, a_move[0], a_move[1])

            game.process_turn()

from quagen.ai.random import RandomAI
from quagen.ai.projection import ProjectionAI
from quagen.ai.biased import BiasedAI

game = Game()
simulation = Simulation(game)
simulation.add_player(ProjectionAI(game, 1, 3))
simulation.add_player(BiasedAI(game, 2, 3))
simulation.run()

print(game._scores)
