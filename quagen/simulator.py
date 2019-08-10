"""
Simulates game between AIs
"""
from multiprocessing import Pool
import statistics

from quagen.game import Game
from quagen.ai.biased import BiasedAI
from quagen.ai.projection import ProjectionAI


class Simulation:
    """
    Simulates AI opponents against on another in a game
    """

    def __init__(self, a_game):
        self._game = a_game
        self._ai_players = []

    def add_player(self, ai_player):
        """
        Add player to simulator
        """
        ai_name = ai_player.__class__.__name__ + "_" + str(len(self._ai_players))
        self._ai_players.append((ai_name, ai_player))
        self._game.add_player(ai_name)

    def run(self):
        """
        Run the simulator
        """
        self._game.start()
        while self._game.board.get_movable_spots():
            for ai_player in self._ai_players:
                ai_name = ai_player[0]
                ai_logic = ai_player[1]

                a_move = ai_logic.choose_move()
                self._game.add_move(ai_name, a_move[0], a_move[1])

            self._game.process_turn()


def simulate_game(number):
    """
    Simulate a single game
    """
    print(f"Starting game {number}")
    a_game = Game()
    simulation = Simulation(a_game)
    simulation.add_player(ProjectionAI(a_game, 1, 2))
    simulation.add_player(BiasedAI(a_game, 2, 2))
    simulation.run()
    return a_game


def main():
    """
    Main
    """
    scores = [
        {"wins": 0, "spot_counts": []},
        {"wins": 0, "spot_counts": []},
        {"wins": 0, "spot_counts": []},
    ]

    with Pool(6) as pool:
        for game in pool.map(simulate_game, [i for i in range(100)]):
            max_player = 0
            max_score = 0
            for i in range(len(game.scores)):
                spot_count = game.scores[i]["controlled"]
                scores[i]["spot_counts"].append(spot_count)
                if spot_count > max_score:
                    max_score = spot_count
                    max_player = i
                elif spot_count == max_score:
                    max_player = 0

            scores[max_player]["wins"] += 1

        for i in range(len(scores)):  # pylint: disable=consider-using-enumerate
            scores[i]["mean"] = statistics.mean(scores[i]["spot_counts"])
            scores[i]["median"] = statistics.median(scores[i]["spot_counts"])
            del scores[i]["spot_counts"]

    print("Simulation results")
    print(str(scores))


if __name__ == "__main__":
    main()
