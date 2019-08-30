'use strict';

export class GameState {

  constructor(gameId) {
    this.gameId = gameId;
    this.init = false;
    this.settings = {};
    this.spotsCurrent = [];
    this.spotsProjected = [];
    this.moveHistory = [];
    this.moveLast = [];
    this.scores = {};
    this.turnCompleted = 0;
    this.turnMoved = 0;
    this.timeCompleted = null;
    this.timeCreated = 0;
    this.timeStarted = null;
    this.timeUpdated = 0;
  }

 update(dict) {

    this.spotsCurrent = dict['board'];
    this.spotsProjected = dict['projected'];
    this.scores = dict['scores']; 
    this.settings = dict['settings'];
    this.turnCompleted = dict['turn_completed']; 
    this.timeCompleted = dict['time_completed'];
    this.timeCreated = dict['time_created'];
    this.timeStarted = dict['time_started'];
    this.timeUpdated = dict['time_updated'];

    this.moveHistory = dict['history'];     
    if (0 < this.moveHistory.length) {
      this.moveLast = this.moveHistory.slice(-1)[0] 
    }

    this.init = true;

  }

  getSetting(key) {
    return this.settings[key];
  }

}


export class GamePoll {

  constructor(gameState, callback) {
    this._gameState = gameState; 
    this._callback = callback
    this._inFlight = false;
    this._timeBetweenPoll = 1000;
  }

  start() {

    const self = this;
    self._poll();
    setInterval(() => {
        self._poll();
      }
      , self._timeBetweenPoll
    );
  }

  _poll() {

    // do not fire off a new request while we still have one in motion
    if (this._inFlight) {
      return;
    }

    this._inFlight = true;
    const self = this;
    const timeUpdated = self._gameState.timeUpdated;
    const queryString = `?updatedAfter=${ timeUpdated }`;

    fetch(`/api/v1/game/${ self._gameState.gameId }${ queryString }`)
      .then((response) => {
        self._inFlight = false;
        if (200 == response.status) {
          return response.json();
        } else {
          throw response.statusText
        }
      })
      .then((data) => {
        if (timeUpdated < data['game']['time_updated']) {
          self._gameState.update(data['game']);
          this._callback();
        }
      }) 
      .catch((error) => {
        self._inFlight = false;
      });
  }
}
