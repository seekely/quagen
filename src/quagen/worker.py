"""
Asynchronous workloads so we don't block anything (like the UI) while we do
some of the more strenuous tasks (like AI choosing next move).

We currently rely on a single worker process for simplicity, but this will
need to be distributed to handle any kind of player load greater than 1.
"""
import signal
import time

from quagen import config
from quagen import queries
from quagen.ai.biased import BiasedAI


def process_outstanding_games():
    """
    Grab and process all games which have unprocessed events
    """
    unprocessed_game_ids = queries.get_unprocessed_game_ids()
    for game_id in unprocessed_game_ids:
        process_game(game_id)


def process_game(game_id):
    """
    Process unprocessed game events for a single game. At the end of a
    successful process, all outstanding events for the game will be marked
    as processed.

    Args:
        game_id (str): Game to process
    """
    game = queries.get_game(game_id)
    events = queries.get_unprocessed_game_events(game_id)

    print(f"Processing {len(events)} events for game {game_id}")
    print(f"{events}")

    if game.is_in_progress():

        handle_ai_movement(game)
        handle_player_movement(game, events)

        # Try to complete a turn -- we may still be missing player turns
        turn_complete = game.process_turn()
        queries.update_game(game)

        # If we did manage to complete a turn, fire off a turn_complete event
        # which will kick off this loop again and allow any AI to get ahead
        # start on processing it's next move.
        if turn_complete:
            queries.insert_game_event(game.game_id, {"type": "turn_complete"})

    # Mark all outstanding events we just went through as processed
    event_ids = [event["id"] for event in events]
    queries.update_processed_events(event_ids)


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
            print(f"Taking turn for AI { ai_id } with strength { ai_strength }")

            ai_method = BiasedAI(game, (i + 1), ai_strength)
            ai_x, ai_y = ai_method.choose_move()

            game.add_move(ai_id, ai_x, ai_y)


def handle_player_movement(game, events):
    """
    Adds any moves made by human players to the game

    Args:
        game (Game): Current game to add moves
        event (list): List of game events which make contain player moves
    """
    for event in events:
        if event["type"] == "move":
            game.add_player(event["player_id"])
            game.add_move(event["player_id"], event["x"], event["y"])


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
            process_outstanding_games()
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
    config.init()

    worker = Worker()
    worker.run()


if __name__ == "__main__":
    main()
