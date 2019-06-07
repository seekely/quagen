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

    def stop(self, signum = None, frame = None):
        self._keep_alive = False

    def _process_game(self, game_id):
        game = queries.get_game(game_id)
        events = queries.get_unprocessed_game_events(game_id)

        print('EVENTS ' + str(events))
    
        for event in events:
            if 'move' == event['type']:
                game.add_player(event['player_id'])
                game.add_move(event['player_id'], event['x'], event['y'])

        game.process_turn()
        queries.update_game(game)

        ai_in_play = game._settings['ai_in_play'] 
        # hack so that AI plays only the first time
        if ai_in_play and game._settings['ai_last_turn'] == game._turn_completed:
            ai_strength = game._settings['ai_in_play'] - 1
            ai_player = 'AI'
            print('Taking turn for player ' + ai_player, 'strength', ai_strength)            
            ai_method = BiasedAI(game, 1, ai_strength)
            ai_x, ai_y = ai_method.choose_move()

            game.add_move(ai_player, ai_x, ai_y)
            game._settings['ai_last_turn'] += 1
            queries.update_game(game)

        event_ids = [event['id'] for event in events]
        queries.update_processed_events(event_ids)



if __name__ == '__main__':
    config.init()

    worker = Worker()
    worker.run()