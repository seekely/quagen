'use strict';

import { Game } from '/static/js/modules/game.mjs';
import { GamePoll } from '/static/js/modules/game.mjs';
import { GameView } from '/static/js/modules/game.mjs';

let game = null;
let gamePoll = null;
let gameView = null;

export function init(gameId) {

  game = new Game(gameId);

  gamePoll = new GamePoll(game);
  gamePoll.poll();
  gamePoll.start();

  gameView = new GameView(game);
  gameView.start();
}

