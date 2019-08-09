from multiprocessing import Pool
import statistics

from quagen.game import Game
from quagen.ai.biased import BiasedAI
from quagen.ai.projection import ProjectionAI
from quagen.ai.random import RandomAI

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
        while (0 < len(self._game.board.get_movable_spots())):
            for ai_player in self._ai_players:
                ai_name = ai_player[0]
                ai_logic = ai_player[1]

                a_move = ai_logic.choose_move()
                self._game.add_move(ai_name, a_move[0], a_move[1])

            self._game.process_turn()


def simulate_game(number):
    game = Game()
    simulation = Simulation(game)
    simulation.add_player(PreviousAI(game, 1, 2))
    simulation.add_player(BiasedAI(game, 2, 2))
    simulation.run()
    return game

if __name__ == '__main__':
    scores = [
        {'wins': 0, 'spot_counts': []},
        {'wins': 0, 'spot_counts': []},
        {'wins': 0, 'spot_counts': []},    
    ]

    with Pool(6) as p:
        for game in p.map(simulate_game, [i for i in range(100)]):
            max_player = 0
            max_score = 0
            for i in range(len(game.scores)):
                spot_count = game.scores[i]['controlled']
                scores[i]['spot_counts'].append(spot_count)
                if spot_count > max_score:
                    max_score = spot_count
                    max_player = i
                elif spot_count == max_score:
                    max_player = 0
   
            scores[max_player]['wins'] += 1

        for i in range(len(scores)):
            scores[i]['mean'] = statistics.mean(scores[i]['spot_counts'])
            scores[i]['median'] = statistics.median(scores[i]['spot_counts'])
            del scores[i]['spot_counts']

    print('Simulation results')
    print(str(scores))