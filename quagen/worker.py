import signal
import sqlite3
import time

from quagen import config
from quagen import queries
from quagen.ai.biased import BiasedAI


class Worker:
    def __init__(self):
        self._keep_alive = True
        signal.signal(signal.SIGINT, self.stop)
        signal.signal(signal.SIGTERM, self.stop)

    def run(self):

        while self._keep_alive:
            unprocessed_game_ids = queries.get_unprocessed_game_ids()

            for game_id in unprocessed_game_ids:
                self._process_game(game_id)

            time.sleep(1)

    def stop(self, signum=None, frame=None):
        self._keep_alive = False

    def _process_game(self, game_id):
        game = queries.get_game(game_id)
        events = queries.get_unprocessed_game_events(game_id)

        print("EVENTS " + str(events))

        for i in range(game.settings["ai_count"]):
            ai_id = str(i)
            if not game.has_moved(ai_id):

                ai_strength = game.settings["ai_strength"]
                print(f"Taking turn for AI { ai_id } with strength { ai_strength }")

                ai_method = BiasedAI(game, (i + 1), ai_strength)
                ai_x, ai_y = ai_method.choose_move()

                game.add_move(ai_id, ai_x, ai_y)

        for event in events:
            if "move" == event["type"]:
                game.add_player(event["player_id"])
                game.add_move(event["player_id"], event["x"], event["y"])

        turn_complete = game.process_turn()
        queries.update_game(game)

        if turn_complete:
            queries.insert_game_event(game.game_id, {"type": "turn_complete"})

        event_ids = [event["id"] for event in events]
        queries.update_processed_events(event_ids)


if __name__ == "__main__":
    config.init()

    worker = Worker()
    worker.run()
