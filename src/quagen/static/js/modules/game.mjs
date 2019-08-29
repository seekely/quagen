'use strict';

export class Game {

  constructor(gameId) {
    this.gameId = gameId;
    this.settings = {};
    this.boardCurrent = [];
    this.boardProjected = [];
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

  /**
   * 
   */
  update(properties) {

    this.boardCurrent = properties['board'];
    this.boardProjected = properties['projected'];
    this.scores = properties['scores']; 
    this.settings = properties['settings'];
    this.turnCompleted = properties['turn_completed']; 
    this.timeCompleted = properties['time_completed'];
    this.timeCreated = properties['time_created'];
    this.timeStarted = properties['time_started'];
    this.timeUpdated = properties['time_updated'];

    this.moveHistory = properties['history'];     
    if (0 < this.moveHistory.length) {
      this.moveLast = this.moveHistory.slice(-1)[0] 
    }

  }

}

export class GamePoll {

  constructor(gameObj) {
    this.game = gameObj; 
    this.inFlight = false;
    this.turnChange = true;
    this.timeBetweenPoll = 1000;
  }

  start() {

    const self = this;
    setInterval(() => {
        self.poll();
      }
      , self.timeBetweenPoll
    );
  }

  poll() {

    // do not fire off a new request while we still have one in motion
    if (this.inFlight) {
      return;
    }

    this.inFlight = true;
    const self = this;
    const timeUpdated = self.game.timeUpdated;
    const queryString = `?updatedAfter=${ timeUpdated }`;

    const xhr = new XMLHttpRequest();
    xhr.responseType = 'json';
    xhr.open('GET', `/api/v1/game/${ self.game.gameId }${ queryString }`);

    xhr.addEventListener('load', (event) => {
      
      if (200 == xhr.status && timeUpdated < xhr.response['game']['time_updated']) {
        const gameDict = xhr.response['game'];
        self.game.update(gameDict);
      }
       
      self.inFlight = false;
    });

    xhr.addEventListener('error', (event) => {
      self.inFlight = false;
    });

    xhr.send(null);
  }
}

export class GameView {

  constructor(gameObj) {
    this.game = gameObj; 
    this.timeBetweenPoll = 100;
    this.addSpotHandlers();
  }

  /**
   * 
   */
  start() {
   const self = this;
    setInterval(() => {
        self.update();
      }
      , self.timeBetweenPoll
    );
  }

  /**
   * 
   */
  update() {
    this.updateScoreboard();
    this.updateBoard();
  }

  /**
   * 
   */
  updateScoreboard() {
    
    const scores = this.game.scores;
    const titles = ['controlled', 'pressuring', 'projected'];

    for (let i = 0; i < scores.length; i++) {      
      for (const title of titles) {
        const elmScore = document.getElementById(`player-${ title }-${ i }`);
        elmScore.innerHTML = scores[i][title];
      }
    }

  }

  /**
   * 
   */
  updateBoard() {

    let board = this.game.boardCurrent;
    const moveLast = this.game.moveLast; 
    const maxPower = this.game.settings['power'];
    const turnCompleted = this.game.turnCompleted;
    const turnMoved = this.game.turnMoved;
    const elmProjected = document.getElementById('option-projected');

    if (elmProjected.checked) {
      board = this.game.boardProjected;
    }

    for (let x = 0; x < board.length; x++) {
      for (let y = 0; y < board[x].length; y++) { 

        const elmSpot = document.getElementById(`spot-${ x }-${ y }`);
        const newPower = board[x][y]['power'];
        const newColor = board[x][y]['color'];
        const newClass = `player-color-${ newColor }`;

        let inLastMove = false;
        for (const move of moveLast) {
          if (move[0] == x && move[1] == y) {
            inLastMove = true;
            break;
          }
        }

        if (inLastMove) {
          elmSpot.classList.add('button-move');
        } else {
          elmSpot.classList.remove('button-move');
        }

        if (turnCompleted >= turnMoved) {
          elmSpot.classList.remove('button-pending');
        }

        if (!elmSpot.classList.contains(newClass)) {

          for (const oldColor of [-1, 0, 1, 2, 3, 4]) {
            elmSpot.classList.remove(`player-color-${ oldColor}`);
          }

          elmSpot.classList.add(newClass);
        }

        if (maxPower == newPower) {
          elmSpot.disabled = true;
          elmSpot.style.opacity = 1
        } else if (0 <= newColor) {
          elmSpot.disabled = false;
          elmSpot.style.opacity = (.60 / maxPower) * newPower;
        } else {
          elmSpot.disabled = false;
          elmSpot.style.opacity = 1
        }
      }
    }
  }

  /**
   * 
   */
  addSpotHandlers() {

    const self = this;
    const gameId = self.game.gameId;
    const buttons = document.getElementsByClassName('button');

    for (const button of buttons) {

      button.addEventListener('mouseup', () => {
        const turnCompleted = self.game.turnCompleted;
        const turnMoved = self.game.turnMoved;
        const spotX = button.getAttribute('data-x');
        const spotY = button.getAttribute('data-y');
        const xhr = new XMLHttpRequest();

        if (turnMoved <= turnCompleted) {

          self.game.turnMoved = turnCompleted + 1;
          button.classList.add('button-pending');

          xhr.responseType = 'json';
          xhr.open('GET', `/api/v1/game/${ self.game.gameId }/move/${ spotX }/${ spotY }`);

          xhr.addEventListener('load', (event) => {
            if (200 != xhr.status) {
              self.game.turnMoved = 0;
            } 
          });

          xhr.addEventListener('error', (event) => {
            self.game.turnMoved = 0;
          });
        }

        xhr.send(null);
      });
    }
  }

}
