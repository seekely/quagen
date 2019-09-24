"use strict";

/**
 * Non component specific game UI controllers
 */

/**
 * Holds on to and answers basic questions about the game state data received
 * from the backend API. We try to treat this object as immutable so to not
 * introduce any state discrepancy between client and server.
 *
 * @property {String} gameId          Game tracked by this object
 * @property {Bool}   init            If the game state has received inital data
 *                                    from backend API
 * @property {Bool}   completed       If the game has ended
 * @property {Array}  moveHistory     Every move made by all players. Looks like:
 *                                    [[(color0, x, y), (color1, x, y)]]
 * @property {Array}  moveLast        Last moves made by all players. Looks like:
 *                                    [(color0, x, y), (color1, x, y)]
 * @property {Object} players         All the players in the game. Looks like:
 *                                    {"id1": {"id": "id1", "ai": false, "color": 0}}
 * @property {Array}  scores          Scores for each player. Looks like:
 *                                    [{"controlled": 0, "pressuring": 0, "projected": 0}]
 * @property {Object} settings        Dictionary of key value pairs for the game settings
 * @property {Array}  spotsCurrent    [x][y] arrays containing data for each spot on the board.
 *                                    Each spot looks like {"color": 0, "power": 3, "pressures":[]}
 * @property {Array}  spotsProjected  [x][y] arrays containing projected data for each spot on the board.
 * @property {Int}    turnCompleted   Number of turns completed in the game.
 * @property {Int}    timeCompleted   Epoch time when game ended.
 * @property {Int}    timeCreated     Epoch time when game was created.
 * @property {Int}    timeStarted     Epoch time when game started.
 * @property {Int}    timeUpdated     Epoch time when game last updated/changed state.
 */
export class GameState {
  /**
   * Constructor
   * @param  {String} gameId Game tracked by this object
   */
  constructor(gameId) {
    this.gameId = gameId;
    this.init = false;
    this.completed = false;
    this.moveHistory = [];
    this.moveLast = [];
    this.players = {};
    this.scores = [];
    this.settings = {};
    this.spotsCurrent = [];
    this.spotsProjected = [];
    this.turnCompleted = 0;
    this.timeCompleted = null;
    this.timeCreated = 0;
    this.timeStarted = null;
    this.timeUpdated = 0;
  }

  /**
   * Update the game state with the new state received from the backend API.
   * @param  {Object} state New game state
   */
  update(state) {
    this.completed = "completed" in state ? state["completed"] : this.completed;
    this.players = "players" in state ? state["players"] : this.players;
    this.scores = "scores" in state ? state["scores"] : this.scores;
    this.settings = "settings" in state ? state["settings"] : this.settings;
    this.spotsCurrent = "board" in state ? state["board"] : this.spotsCurrent;
    this.spotsProjected =
      "projected" in state ? state["projected"] : this.spotsProjected;
    this.turnCompleted =
      "turn_completed" in state ? state["turn_completed"] : this.turnCompleted;
    this.timeCompleted =
      "time_completed" in state ? state["time_completed"] : this.timeCompleted;
    this.timeCreated =
      "time_created" in state ? state["time_created"] : this.timeCreated;
    this.timeStarted =
      "time_started" in state ? state["time_started"] : this.timeStarted;
    this.timeUpdated =
      "time_updated" in state ? state["time_updated"] : this.timeUpdated;

    // From the list of all moves, extract out the latest moves made by each
    // player
    this.moveHistory = "history" in state ? state["history"] : this.moveHistory;
    if (0 < this.moveHistory.length) {
      this.moveLast = this.moveHistory.slice(-1)[0];
    }

    // Mark this object as ready to be consumed by the UI
    this.init = true;
  }

  /**
   * Retrieves a game setting 
   * @param  {String} key Setting key
   * @return (mixed) Setting value
   * @throws {Exception} If setting does not exist
   */
  getSetting(key) {

    if (!(key in this.settings)) {
      throw `Setting '${key}'' does not exist`;
    } 

    return this.settings[key];
  }

  /**
   * If there is more than one human player in the game
   * @return {Bool} True when at least one opponent is human
   */
  isVsHuman() {
    const aiCount = this.getSetting("ai_count");
    const playerCount = this.getSetting("player_count");
    const humanCount = playerCount - aiCount;
    return humanCount > 1;
  }

  /**
   * If there is an AI in the game
   * @return {Bool} True when at least one opponent is AI
   */
  isVsAI() {
    const aiCount = this.getSetting("ai_count");
    return aiCount > 0;
  }
}

/**
 * A short poll to grab the latest game state from the backend API and
 * repopulate a GameState object.
 */
export class GamePoll {
  /**
   * Constructor
   * @param  {GameState} gameState instance to update
   * @param  {Function} optional callback called after update to gameState
   */
  constructor(gameState, callback = null) {
    this._gameState = gameState;
    this._callback = callback;
    this._inFlight = false;
    this._timeBetweenPoll = 1000;
    this._interval = null;
  }

  /**
   * Starts the continuous short poll to the backend API
   */
  async start() {
    const self = this;
    
    if (self._interval == null) {

      self._interval = setInterval(() => {
        self._poll();
      }, self._timeBetweenPoll);

      return self._poll();

    }
  }

  /**
   * Stops the short poll
   */
  stop() {
    if (null != this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    } 
  }

  /**
   * Makes the backend call to the API for the latest game state and updates
   * the GameState object.
   */
  async _poll() {

    // do not fire off a new request while we still have one in motion
    if (this._inFlight) {
      return;
    }

    this._inFlight = true;
    const self = this;

    // Tells the API to only return the full game state if the game state
    // has changed since our last update.
    const timeUpdated = self._gameState.timeUpdated;
    const queryString = `?updatedAfter=${timeUpdated}`;

    return fetch(`/api/v1/game/${self._gameState.gameId}${queryString}`)
      .then(response => {
        self._inFlight = false;
        if (200 == response.status) {
          return response.json();
        } else {
          throw response.statusText;
        }
      })
      .then(data => {
        // If the game state has new info, update and make the user
        // callback
        if (timeUpdated < data["game"]["time_updated"]) {
          self._gameState.update(data["game"]);

          if (null != this._callback) {
            this._callback();
          }
        }
      })
      .catch(() => {
        self._inFlight = false;
      });
  }
}
