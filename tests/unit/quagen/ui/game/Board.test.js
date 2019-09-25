"use strict";
/**
 * Tests for Board component
 */

import Board from "../../../../../src/quagen/ui/game/Board.svelte";
import { isTouching } from "../../../../../src/quagen/ui/utils.js";

// Mock Svelte dispatch calls
const mockDispatch = jest.fn();
jest.mock("svelte", () => ({
  ...jest.requireActual("svelte"),
  createEventDispatcher: jest.fn(() => {
    return mockDispatch;
  })
}));

// Mock util calls
jest.mock("../../../../../src/quagen/ui/utils.js", () => ({
  ...jest.requireActual("../../../../../src/quagen/ui/utils.js"),
  isTouching: jest.fn()
}));

afterEach(() => {
  jest.clearAllMocks();
});

test("Board handles mouse click", () => {
  const target = document.createElement("div");
  const board = new Board({ target });

  // This is a non touch screen
  isTouching.mockReturnValue(false);

  // Every movement event should result in a move dispatch
  let event = {
    detail: { x: 5, y: 6 }
  };

  board.handleSpotSelected(event);
  expect(mockDispatch).toHaveBeenCalledTimes(1);
  expect(isTouching).toHaveBeenCalledTimes(1);

  event = {
    detail: { x: 7, y: 3 }
  };

  board.allowMove = true; // <-- Important
  board.handleSpotSelected(event);
  expect(mockDispatch).toHaveBeenCalledTimes(2);
  expect(isTouching).toHaveBeenCalledTimes(2);
});

test("Board handles touch click", () => {
  const target = document.createElement("div");
  const board = new Board({ target });

  // This is a touch screen
  isTouching.mockReturnValue(true);

  // Only movements in the same spot twice should trigger a move
  let event = {
    detail: { x: 5, y: 6 }
  };

  // No dispatch on first click
  board.handleSpotSelected(event);
  expect(mockDispatch).toHaveBeenCalledTimes(0);
  expect(isTouching).toHaveBeenCalledTimes(1);

  event = {
    detail: { x: 7, y: 3 }
  };

  // Second click is different coords so still no dispatch
  board.handleSpotSelected(event);
  expect(mockDispatch).toHaveBeenCalledTimes(0);
  expect(isTouching).toHaveBeenCalledTimes(2);

  // And now with the same coords dispatch away
  board.handleSpotSelected(event);
  expect(mockDispatch).toHaveBeenCalledTimes(1);
  expect(isTouching).toHaveBeenCalledTimes(3);
});

test("Board handles repeated clicks", () => {
  const target = document.createElement("div");
  const board = new Board({ target });

  // This is a non touch screen
  isTouching.mockReturnValue(false);

  // First click should fire an event
  let event = {
    detail: { x: 5, y: 6 }
  };

  board.handleSpotSelected(event);
  expect(mockDispatch).toHaveBeenCalledTimes(1);
  expect(isTouching).toHaveBeenCalledTimes(1);

  // Allow move is disabled after first event, so fire should be ignored
  board.handleSpotSelected(event);
  expect(mockDispatch).toHaveBeenCalledTimes(1);
  expect(isTouching).toHaveBeenCalledTimes(1);

  // And even different coords are ignored
  event = {
    detail: { x: 7, y: 3 }
  };

  board.handleSpotSelected(event);
  expect(mockDispatch).toHaveBeenCalledTimes(1);
  expect(isTouching).toHaveBeenCalledTimes(1);
});

test("Board detects last move", () => {
  const target = document.createElement("div");
  const board = new Board({ target });

  expect(board.isLastMove([[4, 5], [6, 3], [7, 2]], 0, 0)).toBeFalsy();
  expect(board.isLastMove([[4, 5], [6, 3], [7, 2]], 6, 3)).toBeTruthy();
});
