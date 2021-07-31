"""
Contains the backend game modeling and logic
"""
# pylint: disable=too-many-instance-attributes
# pylint: disable=too-many-public-methods
import copy
import logging
from time import time

from quagen import utils


class Game:
    """
    A single instance of a Quagen game.

    game = Game()
    game.add_player("player1")
    game.add_player("ai1", ai=True)
    game.start()

    while game.is_in_progress()
        game.add_move("player1", x1, y1)
        game.add_move("ai", x2, y2)
        game.process_turn()

    print(game.scores)
    print(game.get_leaders())

    """

    """(dict) Default mutable settings for a game"""
    DEFAULT_SETTINGS = {
        "ai_count": 0,  # Number of AI players
        "ai_strength": 0,  # AI difficulty level
        "dimension_x": 20,  # Width of the game board
        "dimension_y": 20,  # Height of the game board
        "player_count": 2,  # Total number of players in a game (including AI)
        "power": 4,  # Amount of power required for a spot to turn solid
        "pressure": "surronding",  # Where a max power spot exerts pressure
    }

    def __init__(self, params=None):
        if params is None:
            params = {}

        self._game_id = params.get("game_id", utils.generate_id())
        self._completed = params.get("completed", False)
        self._history = params.get("history", [])
        self._players = params.get("players", {})
        self._turn_moves = params.get("turn_moves", {})
        self._turn_completed = params.get("turn_completed", 0)
        self._time_created = params.get("time_created", int(time()))
        self._time_completed = params.get("time_completed", None)
        self._time_started = params.get("time_started", None)
        self._time_updated = params.get("time_updated", int(time()))

        self._settings = copy.deepcopy(Game.DEFAULT_SETTINGS)
        self._settings.update(params.get("settings", {}))

        self._board = Board(params.get("board", {}), self._settings)

        self._scores = []
        if self._time_started is not None:
            self._scores = params.get("scores", self._board.calculate_scores())

    @property
    def game_id(self):
        """Globally unique game id """
        return self._game_id

    @property
    def completed(self):
        """Marks if the game has finished"""
        return self._completed

    @property
    def board(self):
        """Instance of the Board for this game"""
        return self._board

    @property
    def history(self):
        """Entire move history of the game"""
        return self._history

    @property
    def scores(self):
        """Game scores for each player"""
        return self._scores

    @property
    def settings(self):
        """Game settings"""
        return self._settings

    @property
    def time_created(self):
        """Timestamp when game created"""
        return self._time_created

    @property
    def time_completed(self):
        """Timestamp when game completed"""
        return self._time_completed

    @property
    def time_started(self):
        """Timestamp when game started"""
        return self._time_started

    @property
    def time_updated(self):
        """Timestamp last time game state changed"""
        return self._time_updated

    @property
    def turn_completed(self):
        """Number for the last turn completed"""
        return self._turn_completed

    def updated(self):
        """
        Should be called after every state change so we can track when the
        state game last changed state
        """
        self._time_updated = int(time())

    def get_game_state(self):
        """
        Converts the shareable parts of game state to a dictionary

        Returns:
            (dict): Game state as a dictionary
        """
        state = {
            "game_id": self._game_id,
            "completed": self._completed,
            "board": self._board.spots,
            "history": self._history,
            "players": self._players,
            "settings": self._settings,
            "scores": self._scores,
            "leaders": self.get_leaders(),
            "turn_completed": self._turn_completed,
            "time_created": self._time_created,
            "time_completed": self._time_completed,
            "time_started": self._time_started,
            "time_updated": self._time_updated,
        }

        # Hide chosen moves, but indiciate their existence
        state["turn_moves"] = {
            x: [-1, -1, self._turn_moves[x][2]] for x in self._turn_moves
        }

        return state

    def get_game_state_for_player(self, player_id):
        """
        Appends sensitive game state the specified player is privileged to see

        Returns:
            (dict): Game state including sensitive data for a player as a dictionary
        """
        state = self.get_game_state()
        state["player_id"] = player_id
        if player_id in self._turn_moves.keys():
            state["turn_moves"][player_id] = self._turn_moves[player_id]

        return state

    def get_sensitive_state(self):
        """
        Appends sensitive/internal only game state to the shareable dictionary

        Returns:
            (dict): Game state including sensitive data as a dictionary
        """
        state = self.get_game_state()
        state["turn_moves"] = self._turn_moves

        return state

    def start(self):
        """
        Starts the game after all settings finalized
        """
        if self.completed or self.is_in_progress():
            return

        self._time_started = int(time())
        self._board.generate()

        for i in range(self._settings["ai_count"]):
            self.add_player(str(i), True)

    def end(self):
        """
        Marks the game as completed/over
        """
        if not self.is_in_progress():
            return

        self._completed = True
        self._time_completed = int(time())

    def is_in_progress(self):
        """
        If the current game is in progress

        Returns:
            (bool) True if game is in progress
        """
        return self._time_started is not None and self._time_completed is None

    def add_player(self, player_id, is_ai=False):
        """
        Adds a player to play the game if space is available

        Args:
            player_id (str): Id of the player
            is_ai (bool): If the player is AI controlled

        Returns:
            (bool) True on successful addition to the game, false otherwise
        """
        player_added = False
        logging.info(f"Adding player {player_id} to game {self._game_id}")

        player_count = len(self._players.keys())
        if (
            player_count < self._settings["player_count"]
            and player_id not in self._players.keys()
        ):

            logging.info(f"Added player {player_id} to game {self._game_id}")
            player_added = True
            self._players[player_id] = {
                "id": player_id,
                "color": player_count + 1,
                "ai": is_ai,
            }

        return player_added

    def is_player(self, player_id):
        """
        If the player is currently involved in this game

        Args:
            player_id (str): Id of the player to check

        Returns:
            (bool) True if this player is in the game, false otherwise
        """
        return player_id in self._players.keys()

    def add_move(self, player_id, x, y):
        """
        Adds a move to the game after validation. A move is not applied
        to the board until after all moves have been taken and
        process_turn() is called.

        Args:
            player_id (str): id of the player making a move
            x (int): Horizontal spot of the move on the board
            y (int): Vertical spot of the move on the board

        Returns:
            (bool) True on a valid move, false otherwise
        """
        valid_move = False
        logging.info(
            f"Adding move at {x} {y} for player {player_id} in game {self._game_id}"
        )

        if (
            self.is_in_progress()
            and self.is_player(player_id)
            and not self.has_moved(player_id)
            and self._board.validate_move(x, y)
        ):

            player_color = self._players[player_id]["color"]
            self._turn_moves[player_id] = [x, y, player_color]

            logging.info(
                f"Added move at {x} {y} for player {player_id} in game {self._game_id}"
            )
            valid_move = True

        return valid_move

    def has_moved(self, player_id):
        """
        If a player has taken a move for the current turn

        Args:
            player_id (str): Player to check

        Returns:
            (bool) True if the player took a move this turn, false otherwise
        """
        return player_id in self._turn_moves.keys()

    def get_missing_moves(self):
        """
        The players who have yet to move this turn

        Returns:
            (list) Players ids who have yet to move this turn. A missing_player
            means a player has yet to join the game.
        """
        missing = []
        for player in self._players.values():
            if player["id"] not in self._turn_moves.keys():
                missing.append(player["id"])

        # When players have yet to join the game
        if len(self._players.values()) < self._settings["player_count"]:
            missing.append("missing_player")

        return missing

    def get_leaders(self, field="controlled"):
        """
        Returns the current leader(s) on the scoreboard for a passed stat

        Args:
            field (string): Option stat to check

        Returns:
            (list) Leading scores in in the format of (player_color, score)
        """
        leaders = []
        leading_score = -1

        for score in self._scores:
            leading_score = max(leading_score, score[field])

        for i in range(len(self._scores)):
            cur_score = self._scores[i][field]
            if cur_score == leading_score:
                leaders.append((i, cur_score))

        return leaders

    def is_leading(self, player_color, field="controlled", outright=True):
        """
        Determines if the passed player leads in score

        Args:
            player_color (int): Color to judge
            field (string): Optional field in the scores to check
            outright (boolean): If the color is the outright leader for the
            field (no ties)

        Returns:
            (bool) True if the passed player color has the lead
        """
        is_leader = False
        leaders = self.get_leaders(field)

        for leader in leaders:
            if player_color == leader[0]:
                is_leader = True
                break

        return is_leader and (not outright or len(leaders) == 1)

    def process_turn(self):
        """
        Applies the pending moves to the board and takes the game to the
        next turn.

        Returns:
            (bool) True when turn successfully processed
        """
        processed_turn = False

        if self.is_in_progress() and not self.get_missing_moves():

            # For historical sake, the game only cares about the color which
            # took the move. The player ids would be gratuitous.
            self._board.apply_moves(list(self._turn_moves.values()))
            self._board.apply_power()
            self._scores = self._board.calculate_scores()
            self._history.append(list(self._turn_moves.values()))
            self._turn_moves = {}
            self._turn_completed += 1

            if self._check_for_winners():
                self.end()

            logging.info(
                f"Processed turn to {self._turn_completed} in game {self._game_id}"
            )
            processed_turn = True

        return processed_turn

    def _check_for_winners(self):
        """
        Determines if the game has ended due to a winning or tie score.

        Returns:
            (bool) True if winners are amongst us
        """
        available_spots = self._board.get_movable_spots()
        available_count = len(available_spots)

        total_count = self._settings["dimension_x"] * self._settings["dimension_y"]
        majority_count = total_count / 2

        leading_score = 0
        leaders = self.get_leaders()
        if leaders:
            leading_score = leaders[0][1]

        # Determine if any player can catch the current leader
        still_hope = len(self.get_leaders()) != 1
        for score in self._scores:
            if (
                len(leaders) == 1
                and score["controlled"] != leading_score
                and score["controlled"] + available_count >= leading_score
            ):
                still_hope = True
                break

        # The game has ended when there no more moves, or the current leader
        # controls the majority of the board, or no other player can catch the
        # current leader with the number of still available spots.
        is_winner = (
            available_count == 0 or leading_score > majority_count or not still_hope
        )
        logging.debug(f"Is there a winner: {is_winner}")
        logging.debug(f"...Check unavailable: {available_count == 0}")
        logging.debug(f"...Check majority: {leading_score > majority_count}")
        logging.debug(f"...Check no hope: {not still_hope}")
        return is_winner


class Board:
    """
    Model of the x * y dimension game board.
    """

    """(int) When no player controls the board spot"""
    COLOR_NO_PLAYER = -1

    """(int) When the two players make a move on the same board spot"""
    COLOR_COLLISION = 0

    def __init__(self, spots=None, settings=None):
        self._spots = {} if spots is None else spots
        self._settings = {} if settings is None else settings

    @property
    def spots(self):
        """All the spots on the board in x * y lists"""
        return self._spots

    def generate(self):
        """
        Generates the game board based on the current game settings
        """
        self._spots = []
        for _x in range(self._settings["dimension_x"]):
            row = []
            for _y in range(self._settings["dimension_y"]):
                spot = {
                    "color": Board.COLOR_NO_PLAYER,
                    "power": 0,
                    "pressures": [0] * (self._settings["player_count"] + 1),
                }
                row.append(spot)
            self._spots.append(row)

    def get_movable_spots(self):
        """
        Find the spots still allowed to be choosen by a player.

        Returns
            (list) of (x, y) pairs of valid moves
        """
        max_power = self._settings["power"]
        valid_moves = []
        for x in range(self._settings["dimension_x"]):
            for y in range(self._settings["dimension_y"]):
                power = self._spots[x][y]["power"]

                # Only spots not at max power are valid moves
                if power < max_power:
                    valid_moves.append((x, y))

        return valid_moves

    def validate_move(self, x, y):
        """
        Validates if a move at a given spot is allowed.

        Args:
            x (int): Horizontal spot on the board
            y (int): Vertical spot on the board

        Returns:
            (bool) True if valid move
        """
        return (
            self._check_bounds(x, y)
            and self._spots[x][y]["power"] < self._settings["power"]
        )

    def apply_moves(self, moves):
        """
        Takes a list of validated moves from all players and places them on
        the board by setting the spot at the max power level.

        Args:
            moves (list): List of move tuples in the form of (x, y, color)
        """
        deduped_moves = self._dedupe_moves(moves)

        for move in deduped_moves:
            self._spots[move[0]][move[1]]["color"] = move[2]
            self._spots[move[0]][move[1]]["power"] = self._settings["power"]

    def apply_power(self, project=False):
        """
        Spots on the board progress their power level based on the pressure
        applied by surronding spots.

        Args:
            project (bool): If we are applying power during a board projection

        Returns:
            (int) Number of spots which changed power
        """
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
        """
        Simulates the final board if there were no further player input by
        repeatedly applying power until no more spots change hands.

        Returns:
            (Board): A new instance of the board with all spots in their
            final projected state.
        """
        projected_board = Board(
            copy.deepcopy(self._spots), copy.deepcopy(self._settings)
        )
        while projected_board.apply_power(True) > 0:
            pass

        return projected_board

    def calculate_scores(self, project=True):
        """
        Calculates current scoring of the board for each player color and
        black

        Args:
            project (bool): Add a 'projected' score for each player color by
            simulating the rest of the game based on the current board state
            with no furthe player input.

        Returns:
            (list) List of scores for each player color and black.
        """

        max_power = self._settings["power"]
        scores_count = self._settings["player_count"] + 1

        # Generate a score list for each player color and black
        scores = [
            {"controlled": 0, "pressuring": 0, "projected": 0}
            for i in range(scores_count)
        ]

        # Iterate on every spot on the board
        for x in range(self._settings["dimension_x"]):
            for y in range(self._settings["dimension_y"]):
                power = self._spots[x][y]["power"]
                color_control = self._spots[x][y]["color"]
                color_pressure = self._get_pressuring_color(x, y)

                # A spot at max power is firmly in the hands of the current
                # color
                if max_power == power:
                    scores[color_control]["controlled"] += 1

                # If this is a spot under pressure from a color
                elif color_pressure is not None:
                    scores[color_pressure]["pressuring"] += 1

        # To get projected scores for each color, we simlulate out a copy of
        # the board and grab the final controlled spot count for each color.
        if project:
            projected_board = self.project()
            projected_scores = projected_board.calculate_scores(project=False)
            for i in range(len(scores)):  # pylint: disable=consider-using-enumerate
                scores[i]["projected"] = projected_scores[i]["controlled"]

        return scores

    def _check_bounds(self, x, y):
        """
        Check if a given x and y are within the bounds of the board.

        Args:
            x (int): Horizontal spot on the board
            y (int): Vertical spot on the board

        Returns:
            (bool) True if the coordinates are within the bounds of the board.
        """
        return (
            0 <= x < self._settings["dimension_x"]
            and 0 <= y < self._settings["dimension_y"]
        )

    def _dedupe_moves(self, moves):  # pylint: disable=no-self-use
        """
        Takes a list of moves from all players and reduces moves in the same
        spot to a collision.

        Args:
            moves (list): List of move tuples in the form of (x, y, color)

        Returns:
            (list) List of moves with the moves in the same spot replaced by a
            single collision move.
        """
        deduped_moves = {}

        for move in moves:
            move_key = (move[0], move[1])
            if move_key in deduped_moves.keys():
                deduped_moves[move_key] = (move[0], move[1], Board.COLOR_COLLISION)
            else:
                deduped_moves[move_key] = move

        return list(deduped_moves.values())

    def _update_pressures(self):
        """
        Goes through each max power color controlled spot on the board and
        exerts pressure on the appropriate surronding spots.
        """
        max_power = self._settings["power"]

        # Reset all the pressure counts on every spot to 0
        pressure_count = len(self._spots[0][0]["pressures"])
        for x in range(self._settings["dimension_x"]):
            for y in range(self._settings["dimension_y"]):
                self._spots[x][y]["pressures"] = [0] * pressure_count

        # (x, y) list of surronding spots to exert pressure on relative to the
        # current spot
        spots_to_check = self._get_pressure_spots_to_check()

        # Go through every spot on the board and exert pressure on the
        # appropriate surronding spots.
        # pylint: disable=too-many-nested-blocks
        for x in range(self._settings["dimension_x"]):
            for y in range(self._settings["dimension_y"]):

                # Only spots at max power/completley in control exert pressure
                if max_power == self._spots[x][y]["power"]:

                    control_color = self._spots[x][y]["color"]
                    for check_spot in spots_to_check:
                        check_x = x + check_spot[0]
                        check_y = y + check_spot[1]

                        try:
                            if check_y >= 0 and check_x >= 0:
                                self._spots[check_x][check_y]["pressures"][
                                    control_color
                                ] += 1
                        except IndexError:
                            # Exception is faster than bounds check
                            continue

    def _get_pressure_spots_to_check(self):
        """
        Returns:
            List of (x,y) tuples of relative spots to check for pressure based
            on game settings
        """
        pressure_setting = self._settings["pressure"]

        # p represents the spot exerting pressure
        # 1 represents a spot being pressured
        # 0 represents no pressure
        spots_to_check = None
        if pressure_setting == "cross":
            # 0 1 0
            # 1 p 1
            # 0 1 0
            spots_to_check = [(0, -1), (-1, 0), (1, 0), (0, 1)]

        elif pressure_setting == "diagonal":
            # 1 0 1
            # 0 p 0
            # 1 0 1
            spots_to_check = [(-1, -1), (1, -1), (-1, 1), (1, 1)]
        else:
            # 1 1 1
            # 1 p 1
            # 1 1 1
            spots_to_check = [
                (-1, -1),
                (0, -1),
                (1, -1),
                (-1, 0),
                (1, 0),
                (-1, 1),
                (0, 1),
                (1, 1),
            ]

        return spots_to_check

    def _get_pressuring_color(self, x, y):
        """
        Grabs the player color which is currently applying the most pressure
        on a spot.
        Args:
            (int) x: Horizontal spot for pressure calculation
            (int) y: Vertical spot for pressure calculation

        Returns
            (int): The color which applies the greatest pressure. In case of a
            tie, return None.
        """
        greatest_color = None
        greatest_pressure = -1
        checking = self._spots[x][y]["pressures"]

        # pylint: disable=consider-using-enumerate
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
        """
        Go through each spot on the board and update the spot's power level
        based on the current spot pressures.

        Returns:
            (int) Number of spots which changed power
        """
        spots_changed = 0

        for x in range(self._settings["dimension_x"]):
            for y in range(self._settings["dimension_y"]):

                control_color = self._spots[x][y]["color"]
                control_power = self._spots[x][y]["power"]

                # Grab the color which is exerting the most pressure on this
                # spot. This may be none.
                pressure_color = self._get_pressuring_color(x, y)

                # If we have a pressuring color and this spot has not already
                # powered up as far as it can go, apply power changes
                if (
                    pressure_color is not None
                    and self._settings["power"] > control_power
                ):

                    spots_changed += 1

                    # If no color had exerted pressure on the spot previously
                    if Board.COLOR_NO_PLAYER == control_color:
                        self._spots[x][y]["color"] = pressure_color
                        self._spots[x][y]["power"] = 1

                    # If current color is exerting the most pressure
                    elif pressure_color == control_color:
                        self._spots[x][y]["power"] += 1

                    # If a different color is exerting the most pressure
                    else:
                        self._spots[x][y]["power"] -= 1
                        if self._spots[x][y]["power"] == 0:
                            self._spots[x][y]["color"] = Board.COLOR_NO_PLAYER

        return spots_changed
