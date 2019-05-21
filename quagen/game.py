import copy
from time import time

from quagen import utils 

class Game: 

    '''(dict) Default mutable settings for a game'''
    DEFAULT_SETTINGS = {
        'dimension_x': 20,          # Width of the game board
        'dimension_y': 20,          # Height of the game board
        'player_count': 2,          # Number of players in a game
        'power': 4 ,                # Amount of power acquired for a spot to turn solid
        'pressure': 'surronding'    # Where a max power spot exerts pressure
    }

    def __init__(self, params = {}):
        self._game_id = params.get('game_id', utils.generate_id())
        self._history = params.get('history', [])
        self._players = params.get('players', {})
        self._turn_moves = params.get('turn_moves', {})
        self._turn_completed = params.get('turn_completed', 0)
        self._time_created = params.get('time_created', int(time())) 
        self._time_completed = params.get('time_completed', None)
        self._time_started = params.get('time_started', None)
        self._time_updated = params.get('time_updated', int(time()))

        self._settings = copy.deepcopy(Game.DEFAULT_SETTINGS)  
        self._settings.update(params.get('settings', {}))

        self._board = Board(params.get('board', {}), self._settings)
        self._scores = params.get('scores', self._board.calculate_scores())

    @property
    def game_id(self):
        return self._game_id

    @property
    def board(self):
        return self._board

    @property
    def history(self):
        return self._history

    @property
    def settings(self):
        return self._settings

    @property
    def time_created(self):
        return self._time_created

    @property
    def time_completed(self):
        return self._time_completed

    @property
    def time_started(self):
        return self._time_started

    @property
    def time_updated(self):
        return self._time_updated

    @property 
    def turn_completed(self):
        return self._turn_completed

    def updated(self):
        self._time_updated = int(time())

    def as_dict(self, shared_with_client = True):
        '''
        Converts the relevant parts of this object to a dictionary 
    
        Attr:
            shared_with_client (bool): If the data will be shared with the 
            client, in which case we will want to keep some data out. 

        Returns:
            (dict): Game object as a dictionary
        '''
        game = {
            'game_id':          self._game_id,
            'board':            self._board.spots,
            'history':          self._history,
            'players':          self._players,
            'settings':         self._settings,
            'scores':           self._scores,
            'turn_completed':   self._turn_completed,
            'time_created':     self._time_created,
            'time_completed':   self._time_completed,
            'time_started':     self._time_started,
            'time_updated':     self._time_updated
        }

        if not shared_with_client:
            game['turn_moves'] = self._turn_moves

        return game

    def start(self):
        '''
        Readies a game after all players joined and settings finalized
        '''
        self._time_started = int(time())

    def add_player(self, player_id):
        '''
        Adds a player to play the game if space is available

        Args:
            player_id (str): Id of the player 

        Returns:
            True on successful addition to the game, false otherwise
        '''
        player_added = False
        print('Adding player ' + player_id)

        player_count = len(self._players.keys())
        if (player_count < self._settings['player_count'] and 
            player_id not in self._players.keys()):

            print('Valid player add')
            player_added = True
            self._players[player_id] = {
                'color': player_count + 1,
            }

        return player_added

    def add_move(self, player_id, x, y, log=True):
        '''
        Adds a move to the game after validation. A move is not applied 
        to the board until after all moves have been taken and 
        process_turn() is called.

        Args:
            player_id (str): id of the player making a move
            x (int): Horizontal spot of the move on the board
            y (int): Vertical spot of the move on the board
        
        Returns:
            True on a valid move, false otherwise
        ''' 
        valid_move = False
        if log:
            print('Adding move at ' + str(x) + " " + str(y) + " for player " + player_id )

        if (None is not self._time_started and 
            player_id in self._players.keys() and 
            player_id not in self._turn_moves.keys() and
            self._board.validate_move(x, y)):

            player_color = self._players[player_id]['color']
            self._turn_moves[player_id] = [x, y, player_color]

            if log: 
                print('Valid move')
            valid_move = True

        return valid_move

    def process_turn(self):
        '''
        Applies the pending moves to the board and takes the game to the 
        next turn. 

        Returns:
            True when successfully processed 
        '''
        processed_turn = False

        if (self._settings['player_count'] == len(self._turn_moves.keys())):

            # For historical sake, the game only cares about the color which 
            # took the move. The player ids would be gratuitous.    
            moves = list(self._turn_moves.values())

            self._board.apply_moves(list(self._turn_moves.values()))
            self._board.apply_power()
            self._scores = self._board.calculate_scores()
            self._history.append(list(self._turn_moves.values()))
            self._turn_moves = {}
            self._turn_completed += 1

            print('Processed turn to ' + str(self._turn_completed))
            processed_turn = True

        return processed_turn

class Board:

    '''(int) When no player controls the board spot'''
    COLOR_NO_PLAYER = -1

    '''(int) When the two players make a move on the same board spot'''
    COLOR_COLLISION = 0

    def __init__(self, spots = {}, settings = {}):
        self._spots = spots
        self._settings = settings

        if {} == self._spots:
            self.generate()


    @property
    def spots(self):
        return self._spots

    def generate(self):
        ''' 
        Generates the board based on the current game settings
        ''' 
        self._spots = []
        for x in range(self._settings['dimension_x']):
            row = []
            for y in range(self._settings['dimension_y']):
                spot = {
                    'color': Board.COLOR_NO_PLAYER,
                    'power': 0,
                    'pressures': [0] * (self._settings['player_count'] + 1)
                }
                row.append(spot)
            self._spots.append(row)

    def get_valid_moves(self):
        '''
        Find the spots still allowed to be choosen by a player.
        
        Returns
            (list) of (x, y) pairs of valid moves
        ''' 
        max_power = self._settings['power']
        valid_moves = []
        for x in range(self._settings['dimension_x']):
            for y in range(self._settings['dimension_y']):
                power = self._spots[x][y]['power']
                
                # Only spots not at max power are valid moves
                if power < max_power:
                    valid_moves.append((x, y))

        return valid_moves

    def validate_move(self, x, y):
        '''
        Validates if a move at a given spot is allowed.
        
        Args:
            x (int): Horizontal spot on the board 
            y (int): Vertical spot on the board

        Returns:
            (bool) True if valid move
        ''' 
        return (self._check_bounds(x, y) and 
                self._spots[x][y]['power'] < self._settings['power'])

    def apply_moves(self, moves):
        '''
        Takes a list of validated moves from all players and places them on 
        the board by setting the spot at the max power level.
        
        Args:
            moves (list): List of move tuples in the form of (x, y, color)
        '''
        deduped_moves = self._dedupe_moves(moves)

        for move in deduped_moves:
            self._spots[move[0]][move[1]]['color'] = move[2]
            self._spots[move[0]][move[1]]['power'] = self._settings['power']

    def apply_power(self, project = False):
        '''
        Spots on the board progress their power level based on the pressure 
        applied by surronding spots.

        Args:
            project (bool): If we are applying power during a board projection

        Returns:
            (int) Number of spots which changed power
        '''
        changed = 0

        # Each spot on the board will undergo pressure to change based on 
        # the number of a color of surronding spots.
        self._update_pressures()

        # Apply the calculated pressure to each spot on the board.
        changed = self._update_powers()

        if not project:
            # Update the pressures again as there are likely new maxed out power 
            # spots, and we want the scores to accurately reflect those pressures.
            self._update_pressures()  

        return changed

    def project(self):
        '''
        Simulates the final board if there were no further player input by 
        repeatedly applying power until no more spots change hands. 

        Returns:
            (Board): A new instance of the board with all spots in their 
            final projected state.
        '''
        projected_board = Board(copy.deepcopy(self._spots), copy.deepcopy(self._settings))
        while 0 < projected_board.apply_power(True):
            pass

        return projected_board


    def calculate_scores(self, project = True):
        '''
        Calculates current scoring of the board for each player color and 
        black

        Args:
            project (bool): Add a 'projected' score for each player color by 
            simulating the rest of the game based on the current board state 
            with no furthe player input.

        Returns:
            (list) List of scores for each player color and black.
        '''

        max_power = self._settings['power']
        scores_count = self._settings['player_count'] + 1
        
        # Generate a score list for each player color and black
        scores = [{'controlled': 0, 'pressuring': 0, 'projected': 0} 
                  for i in range(scores_count)] 

        # Iterate on every spot on the board 
        for x in range(self._settings['dimension_x']):
            for y in range(self._settings['dimension_y']):
                power = self._spots[x][y]['power']
                color_control = self._spots[x][y]['color']
                color_pressure = self._get_pressuring_color(x, y)

                # A spot at max power is firmly in the hands of the current 
                # color 
                if max_power == power:
                    scores[color_control]['controlled'] += 1

                # If this is a spot under pressure from a color
                elif color_pressure is not None:
                    scores[color_pressure]['pressuring'] += 1

        # To get projected scores for each color, we simlulate out a copy of 
        # the board and grab the final controlled spot count for each color. 
        if project:
            projected_board = self.project()
            projected_scores = projected_board.calculate_scores(project = False)
            for i in range(len(scores)):
                scores[i]['projected'] = projected_scores[i]['controlled']

        return scores

    def _check_bounds(self, x, y):
        '''
        Check if a given x and y are within the bounds of the board.
        
        Args:
            x (int): Horizontal spot on the board
            y (int): Vertical spot on the board
        
        Returns:
            (bool) True if the coordinates are within the bounds of the board. 
        '''
        return (0 <= x < self._settings['dimension_x'] and 
                0 <= y < self._settings['dimension_y']) 

    def _dedupe_moves(self, moves):
        '''
        Takes a list of moves from all players and reduces moves in the same 
        spot to a collision.

        Args:
            moves (list): List of move tuples in the form of (x, y, color)

        Returns:
            (list) List of moves with the moves in the same spot replaced by a 
            single collision move.
        '''
        deduped_moves = {}

        for move in moves:
            move_key = (move[0], move[1])
            if (move_key in deduped_moves.keys()):
                deduped_moves[move_key] = (move[0], move[1], Board.COLOR_COLLISION)
            else:
                deduped_moves[move_key] = move

        return list(deduped_moves.values())

    def _update_pressures(self):
        '''
        Goes through each spot on the board and updates the pressures on the 
        spot by each color by counting the surronding spots which have 
        already reached max power level. 
        '''

        # (x, y) list of surronding spots to check relative to the current spot
        spots_to_check = self._get_pressure_spots_to_check()

        # Go through every spot on the board and calculate the spots new 
        # pressure
        for x in range(self._settings['dimension_x']):
            for y in range(self._settings['dimension_y']):
                new_pressures = self._calculate_pressures_for_spot(x, y, spots_to_check)
                self._spots[x][y]['pressures'] = new_pressures

    def _get_pressure_spots_to_check(self):
        '''
        Returns:
            List of (x,y) tuples of relative spots to check for pressure based 
            on game settings 
        '''
        pressure_setting = self._settings['pressure']

        # p represents the spot being pressured
        # 1 represents a spot pressuring
        # 0 represents no pressure
        spots_to_check = None
        if 'cross' == pressure_setting:
            # 0 1 0
            # 1 p 1
            # 0 1 0
            spots_to_check = [
              (0, -1), (-1, 0), (1, 0), (0, 1)
            ] 

        elif 'diagonal' == pressure_setting:
            # 1 0 1
            # 0 p 0
            # 1 0 1
            spots_to_check = [
               (-1, -1), (1, -1), (-1, 1), (1, 1)
            ] 
        else:
            # 1 1 1
            # 1 p 1
            # 1 1 1
            spots_to_check = [
               (-1, -1), (0, -1), (1, -1)
              , (-1, 0), (1, 0)
              , (-1, 1), (0, 1), (1, 1)
            ]

        return spots_to_check

    def _calculate_pressures_for_spot(self, x, y, spots_to_check):
        '''
        Calculate the pressure on a single board spot by looking at the passed 
        spots to check.

        Args:
            (int) x: Horizontal spot for pressure calculation
            (int) y: Vertical spot for pressure calculation
            (list) spots_to_check: Tuples of relative (x,y) spots to check

        Returns:
            (list) List of pressures on a spot indexed by color
        ''' 
        max_power = self._settings['power']

        new_pressures = [0] * len(self._spots[x][y]['pressures'])
        for check_spot in spots_to_check:
            check_x = x + check_spot[0]
            check_y = y + check_spot[1]
            
            # If the spot we are checking has reached max power, it 
            # applies pressure
            if (self._check_bounds(check_x, check_y) and
                max_power == self._spots[check_x][check_y]['power']):
               
                # Increase the pressure on this spot for the color controlling 
                # the checked spot
                pressure_color = self._spots[check_x][check_y]['color']
                new_pressures[pressure_color] += 1

        return new_pressures

    def _get_pressuring_color(self, x, y):
        '''
        Grabs the player color which is currently applying the most pressure 
        on a spot.
        Args:
            (int) x: Horizontal spot for pressure calculation
            (int) y: Vertical spot for pressure calculation

        Returns
            (int): The color which applies the greatest pressure. In case of a 
            tie, return None. 
        '''
        greatest_color = None
        greatest_pressure =-1
        checking = self._spots[x][y]['pressures']

        for i in range(len(checking)):
            if greatest_pressure < checking[i]:
                greatest_color = i
                greatest_pressure = checking[i]
            # If we have a tie for greatest pressure, then there is no 
            # pressuring color.
            elif greatest_pressure == checking[i]:
                greatest_color = None

        return greatest_color

    def _update_powers(self):
        '''
        Go through each spot on the board and update the spot's power level 
        based on the current spot pressures.

        Returns:
            (int) Number of spots which changed power
        '''
        spots_changed = 0

        for x in range(self._settings['dimension_x']):
            for y in range(self._settings['dimension_y']):

                control_color = self._spots[x][y]['color']
                control_power = self._spots[x][y]['power']

                # Grab the color which is exerting the most pressure on this 
                # spot. This may be none.
                pressure_color = self._get_pressuring_color(x, y)

                # If we have a pressuring color and this spot has not already
                # powered up as far as it can go, apply power changes
                if (None != pressure_color and
                    self._settings['power'] > control_power):

                    spots_changed += 1

                    # If no color had exerted pressure on the spot previously
                    if Board.COLOR_NO_PLAYER == control_color:
                        self._spots[x][y]['color'] = pressure_color
                        self._spots[x][y]['power'] = 1
                    
                    # If current color is exerting the most pressure
                    elif pressure_color == control_color:
                        self._spots[x][y]['power'] += 1

                    # If a different color is exerting the most pressure
                    else:
                        self._spots[x][y]['power'] -= 1
                        if 0 == self._spots[x][y]['power']:
                            self._spots[x][y]['color'] = Board.COLOR_NO_PLAYER

        return spots_changed
