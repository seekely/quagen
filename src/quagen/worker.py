"""
Asynchronous workloads so we don't block anything (like the UI) while we do
some of the more strenuous tasks (like AI choosing next move).

We currently rely on a single worker process for simplicity, but this will
need to be distributed to handle any kind of player load greater than 1.
"""
import logging
import signal
import time

from quagen import config
from quagen import db
from quagen import migrator
from quagen import queries
from quagen.ai.biased import BiasedAI


def process_outstanding_game():
    """
    Lock a  and process all games which have unprocessed events
    """
    with db.get_connection():
        game = queries.get_unprocessed_game_id()
        if game:
            process_game(game)
            logging.debug(f"{game.board.spots}")

def process_game(game):
    """
    Process unprocessed game events for a single game. At the end of a
    successful process, all outstanding events for the game will be marked
    as processed.

    Args:
        game_id (str): Game to process
    """

    moves = queries.get_game_moves(game.game_id, game.turn)
    logging.info(f"Processing turn {game.turn} for game {game.game_id}")
    logging.debug(f"{moves}")

    if game.is_in_progress():

        handle_ai_movement(game)
        handle_player_movement(game, moves)

        # Complete the turn
            game.process_turn()

        with db.get_connection():
            logging.info("okok")
            queries.update_game(game)
            queries.reset_game_awaiting_moves(game)
            logging.info("yup")


def handle_ai_movement(game):
    """
    Makes a move for any AI player which has yet to move in the passed
    game

    Args:
        game (Game): Current game to make moves for the AI

    """
    for i in range(game.settings["ai_count"]):
        ai_id = str(i)
        if not game.has_moved(ai_id):

            ai_strength = game.settings["ai_strength"]
            logging.info(f"Taking turn for AI { ai_id } with strength { ai_strength }")

            ai_method = BiasedAI(game, (i + 1), ai_strength)
            ai_x, ai_y = ai_method.choose_move()

            game.add_move(ai_id, ai_x, ai_y)
            with db.get_connection():
                queries.insert_game_move(game.game_id, ai_id, game.turn, ai_x, ai_y)


def handle_player_movement(game, moves):
    """
    Adds any moves made by human players to the game

    Args:
        game (Game): Current game to add moves
        event (list): List of game events which make contain player moves
    """
    for move in moves:
        game.add_player(move["player_id"])
        game.add_move(move["player_id"], move["x"], move["y"])


class Worker:
    """
    A simple background worker which eats through unprocessed game events
    until the process is killed.
    """

    def __init__(self):
        self._keep_alive = True
        signal.signal(signal.SIGINT, self.stop)
        signal.signal(signal.SIGTERM, self.stop)

    def run(self):
        """
        Run
        """

        while self._keep_alive:
            process_outstanding_game()
            time.sleep(0.25)

    def stop(self, signum=None, frame=None):
        """
        Stop
        """
        self._keep_alive = False
        if signum or frame:
            pass


def main():
    """
    Main
    """
    logging.info("Worker coming online")
    config.init()

    # Wait for the db to be in good state until we fire up
    db.get_connection(True)
    migrator.wait_until_migrated()

    logging.info("Worker now running")
    worker = Worker()
    worker.run()


if __name__ == "__main__":
    main()
