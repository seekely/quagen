"""
Shows how to pit two AIs against one another in a 100 game simulation using
the Quagen simulator.

Usage:
    cd quagen
    source venv/bin/activate
    export PYTHONPATH=src

    python bin/examples/simulate_ais.py

"""

from quagen.simulator import simulate
from quagen.ai.biased import BiasedAI
from quagen.ai.random import RandomAI


def setup_ais(simulation):
    """
    The hook we provide to the simulator so we can add our AIs to the
    simulated games.

    Args:
        simulation (Simulation): A single game simulation
    """

    # RandomAI(game, player_color, strength)
    ai_random = RandomAI(simulation.game, 1, 0)
    simulation.add_ai_player(ai_random)

    # BiasedAI(game, player_color, strength)
    ai_biased = BiasedAI(simulation.game, 2, 2)
    simulation.add_ai_player(ai_biased)


def main():
    """Fires off the simulation of 100 games """
    results = simulate(setup_ais, 100)
    logging.info((str(results))


if __name__ == "__main__":
    main()
