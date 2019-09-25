"use strict";
/**
 * Tests for game module
 */

import { GameState, GamePoll } from "../../../../src/quagen/ui/game";

test("GameState updates correct fields", () => {
  const gameState = new GameState("test1234");
  gameState.players = { "1": { ai: false } };
  gameState.timeCreated = 12345678;
  gameState.timeUpdated = 87654321;

  gameState.update({
    players: { "1": { ai: false }, "2": { ai: true } },
    time_updated: 12345678,
    ignored: false
  });

  expect(gameState.timeCreated).toBe(12345678);
  expect(gameState.timeUpdated).toBe(12345678);
  expect(gameState.players).toStrictEqual({
    "1": { ai: false },
    "2": { ai: true }
  });
});

test("GameState retrieve setting", () => {
  const gameState = new GameState("test1234");
  gameState.update({ settings: { animal: "goat", fish: "octopus" } });

  expect(gameState.getSetting("animal")).toBe("goat");
});

test("GameState invalid setting throws exception", () => {
  const gameState = new GameState("test1234");
  gameState.update({ settings: { animal: "goat", fish: "octopus" } });

  expect(() => {
    gameState.getSetting("octopus");
  }).toThrow();
});

test("GameState knows human opponents", () => {
  const gameState = new GameState("test1234");

  // Only 1 human player here
  let settings = {
    settings: {
      ai_count: 1,
      player_count: 2
    }
  };

  gameState.update(settings);
  expect(gameState.isVsHuman()).toBeFalsy();

  // Now 2 human players
  settings = {
    settings: {
      ai_count: 1,
      player_count: 3
    }
  };

  gameState.update(settings);
  expect(gameState.isVsHuman()).toBeTruthy();

  // And now with only human players
  settings = {
    settings: {
      ai_count: 0,
      player_count: 4
    }
  };

  gameState.update(settings);
  expect(gameState.isVsHuman()).toBeTruthy();
});

test("GameState knows AI opponents", () => {
  const gameState = new GameState("test1234");

  // Only humans here -- these are not the androids you  are looking for
  let settings = {
    settings: {
      ai_count: 0,
      player_count: 2
    }
  };

  gameState.update(settings);
  expect(gameState.isVsAI()).toBeFalsy();

  // Now humans and ai mingle
  settings = {
    settings: {
      ai_count: 1,
      player_count: 2
    }
  };

  gameState.update(settings);
  expect(gameState.isVsAI()).toBeTruthy();

  // And now with only AIs
  settings = {
    settings: {
      ai_count: 3,
      player_count: 0
    }
  };

  gameState.update(settings);
  expect(gameState.isVsAI()).toBeTruthy();
});

test("GamePoll starts polling", () => {
  // Mock our timers so we don't have to wait
  jest.useFakeTimers();

  const gameState = new GameState("test1234");

  // Mock out our poll function so we don't call out to server
  const gamePoll = new GamePoll(gameState, () => {});
  gamePoll._poll = jest.fn();

  gamePoll.start();
  expect(setInterval).toHaveBeenCalledTimes(1);
  expect(gamePoll._poll).toHaveBeenCalledTimes(1);
});

test("GamePoll recurs poll", () => {
  // Mock our timers so we don't have to wait
  jest.useFakeTimers();

  const gameState = new GameState("test1234");

  // Mock out our poll function so we don't call out to server
  const gamePoll = new GamePoll(gameState, () => {});
  gamePoll._poll = jest.fn();

  gamePoll.start();
  jest.advanceTimersByTime(gamePoll._timeBetweenPoll);
  expect(setInterval).toHaveBeenCalledTimes(1);
  expect(gamePoll._poll).toHaveBeenCalledTimes(2);
});

test("GamePoll hits callbacks", async () => {
  // Mock our timers so we don't have to wait
  jest.useFakeTimers();

  // Spy on the update function
  const gameState = new GameState("test1234");
  const mockUpdate = jest.fn(() => {});
  gameState.update = mockUpdate;

  // Spy on our callback
  const mockBack = jest.fn();
  const gamePoll = new GamePoll(gameState, mockBack);

  // Have `fetch` grab mocked data
  const mockData = { game: { time_updated: 5 } };
  const mockJsonPromise = Promise.resolve(mockData);
  const mockFetchPromise = Promise.resolve({
    status: 200,
    json: () => mockJsonPromise
  });
  global.fetch = jest.fn().mockImplementation(() => mockFetchPromise);

  await gamePoll.start();
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  expect(mockBack).toHaveBeenCalledTimes(1);

  global.fetch.mockClear();
  delete global.fetch;
});

test("GamePoll misses callbacks on bad response", async () => {
  // Mock our timers so we don't have to wait
  jest.useFakeTimers();

  // Spy on the update function
  const gameState = new GameState("test1234");
  const mockUpdate = jest.fn(() => {
    console.log("confusing");
  });
  gameState.update = mockUpdate;

  // Spy on our callback
  const mockBack = jest.fn();
  const gamePoll = new GamePoll(gameState, mockBack);

  // Have `fetch` grab mocked data
  const mockFetchPromise = Promise.resolve({ status: 404 });
  global.fetch = jest.fn().mockImplementation(() => mockFetchPromise);

  await gamePoll.start();
  expect(mockUpdate).toHaveBeenCalledTimes(0);
  expect(mockBack).toHaveBeenCalledTimes(0);

  global.fetch.mockClear();
  delete global.fetch;
});
