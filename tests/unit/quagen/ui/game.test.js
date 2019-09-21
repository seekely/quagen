"use strict";
/**
 * Tests for game module
 */

const game = require("../../../../src/quagen/ui/game.js");

test('GameState updates correct fields', () => {

  const gameState = new game.GameState("test1234");
  gameState.players = {"1": {"ai": false}};
  gameState.timeCreated = 12345678;
  gameState.timeUpdated = 87654321;

  gameState.update({
    "players": {"1": {"ai": false}, "2": {"ai": true}},
    "time_updated":  12345678,
    "ignored": false
  });

  expect(gameState.timeCreated).toBe(12345678);
  expect(gameState.timeUpdated).toBe(12345678);
  expect(gameState.players).toStrictEqual({"1": {"ai": false}, "2": {"ai": true}});
});


test('GameState knows human opponents', () => {

  const gameState = new game.GameState("test1234");
  
  // Only 1 human player here
  let settings = {
    "settings": {
      "ai_count": 1,
      "player_count": 2
    }
  }

  gameState.update(settings)
  expect(gameState.isVsHuman()).toBeFalsy();

  // Now 2 human players
  settings = {
    "settings": {
      "ai_count": 1,
      "player_count": 3
    }
  }

  gameState.update(settings)
  expect(gameState.isVsHuman()).toBeTruthy();

  // And now with only human players
  settings = {
    "settings": {
      "ai_count": 0,
      "player_count": 4
    }
  }

  gameState.update(settings)
  expect(gameState.isVsHuman()).toBeTruthy();
});

test('GameState knows AI opponents', () => {

  const gameState = new game.GameState("test1234");
  
  // Only humans here -- these are not the androids you  are looking for
  let settings = {
    "settings": {
      "ai_count": 0,
      "player_count": 2
    }
  }

  gameState.update(settings)
  expect(gameState.isVsAI()).toBeFalsy();

  // Now humans and ai mingle
  settings = {
    "settings": {
      "ai_count": 1,
      "player_count": 2
    }
  }

  gameState.update(settings)
  expect(gameState.isVsAI()).toBeTruthy();

  // And now with only AIs
  settings = {
    "settings": {
      "ai_count": 3,
      "player_count": 0
    }
  }

  gameState.update(settings)
  expect(gameState.isVsAI()).toBeTruthy();
});
