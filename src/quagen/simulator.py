"""
Simulates games between multiple AIs.

See bin/examples/simulate_ais.py for usage example.
"""
import multiprocessing
from multiprocessing import Pool
import statistics

from quagen.game import Game

"""(int) Default number of games to simulate"""
DEFAULT_SIMULATION_COUNT = 100

"""(int) Default number of games to simulate simultaneously"""
DEFAULT_SIMULATION_CONCURRENCY = max(1, multiprocessing.cpu_count() - 1)


class Simulation:
    """
    A single game simulation
    """

    def __init__(self):
        self._game = Game()
        self._ai_players = []

    @property
    def game(self):
        """The game being simulated"""
        return self._game

    def add_ai_player(self, ai_instance):
        """
        Add an AI player to to the simulation

        Args:
            ai_instance (AI): Instance of an AI class

        """
        ai_name = ai_instance.__class__.__name__ + "_" + str(len(self._ai_players))
        self._ai_players.append((ai_name, ai_instance))
        self._game.add_player(ai_name)

    def run(self):
        """
        Simulate the game until completion
        """
        self._game.start()
        while self._game.is_in_progress():
            for ai_player in self._ai_players:
                ai_name = ai_player[0]
                ai_instance = ai_player[1]

                x, y = ai_instance.choose_move()
                self._game.add_move(ai_name, x, y)

            self._game.process_turn()


def run_simulation(simulation):
    """
    Fires of the simulation of a single game. Useful for the multiprocessing
    map call.

    Args:
        simulation (Simulation): Instance of a single game simulation

    Returns:
        (Simulation) Completed simulation

    """
    print(f"Starting simulation {simulation.game.game_id}")
    simulation.run()
    return simulation


def simulate(
    setup_callback,
    number_games=DEFAULT_SIMULATION_COUNT,
    concurrency=DEFAULT_SIMULATION_CONCURRENCY,
):
    """
    User entry point for simulating games.

    Args:
        setup_callback (function): Hook called before a game starts simulating
            to give the user a chance to tweak the game settings and add AI
            players. Called with parameters setup_callback(simluation).
        number_games (int): Optional number of games to simulate.
        concurrency (int): Optional number of concurrent simulations.

    Returns:
        (dict) Tallied scores for each AI player

    """

    print(f"Simulating {number_games} with concurrency of {concurrency}")
    simulations = []
    results = {}

    # Create all our simulations and call the user's hook for further setup
    for i in range(number_games):  # pylint: disable=unused-variable
        simulation = Simulation()
        setup_callback(simulation)
        simulations.append(simulation)

    # Run through the simulations concurrently
    with Pool(concurrency) as pool:
        for simulation in pool.map(run_simulation, simulations):

            scores = simulation.game.scores
            leaders = simulation.game.get_leaders()

            # Keep a record of every score for every game for each player
            for color in range(len(scores)):  # pylint: disable=consider-using-enumerate
                if color not in results.keys():
                    results[color] = {"wins": 0, "scores": []}

                results[color]["scores"].append(scores[color]["controlled"])

            # Add a win to the player's tally for outright wins (ignore ties).
            if len(leaders) == 1:
                results[leaders[0][0]]["wins"] += 1

    for tally in results.values():
        tally["mean"] = statistics.mean(tally["scores"])
        tally["median"] = statistics.median(tally["scores"])
        tally["min"] = min(tally["scores"])
        tally["max"] = max(tally["scores"])
        del tally["scores"]

    print(f"Simulation complete")
    return results
