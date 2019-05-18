'use strict';

export class Game {

  constructor(gameId) {
    this.gameId = gameId;
    this.turnsCompleted = 0;
    this.settings = {};
    this.boardCurrent = [];
    this.boardProjected = [];
    this.scores = {};
    this.movesHistory = [];
    this.movesLast = [];
  }

  /**
   * 
   */
  update(properties) {

    this.settings = properties['settings'];
    this.movesHistory = properties['past_moves'];     
    this.scores = properties['scores']; 
    this.currentTurn = properties['turn_number']; 

    this.movesHistory = properties['past_moves'];     
    if (0 < this.movesHistory.length) {
      this.movesLast = this.movesHistory.slice(-1)[0] 
    }

    if ('board' in properties) {
      this.boardCurrent = properties['board'];
    }

    if ('projected' in properties) {
      this.boardProjected = properties['projected'];
    }
  }

}

export class GamePoll {

  constructor(gameObj) {
    this.game = gameObj; 
    this.inFlight = false;
    this.timeBetweenPoll = 2000;
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
    const xhr = new XMLHttpRequest();

    xhr.responseType = 'json';
    xhr.open('GET', `/api/v1/game/${ self.game.gameId }`);

    xhr.addEventListener('load', (event) => {
      const gameDict = xhr.response['game'];
      self.game.update(gameDict);

      self.inFlight = false;
    });

    xhr.addEventListener('error', (event) => {
      self.inFlight = true;
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
    const movesLast = this.game.movesLast; 
    const maxPower = this.game.settings['power'];
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
        for (const move of movesLast) {
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

        if (!elmSpot.classList.contains(newClass)) {

          for (const oldColor of [-1, 0, 1, 2, 3]) {
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
        const spotX = button.getAttribute('data-x');
        const spotY = button.getAttribute('data-y');
        const xhr = new XMLHttpRequest();

        xhr.responseType = 'json';
        xhr.open('GET', `/api/v1/game/${ self.game.gameId }/move/${ spotX }/${ spotY }`);

        xhr.addEventListener('load', (event) => {
        });

        xhr.addEventListener('error', (event) => {
        });

        xhr.send(null);
      });
    }
  }

}
