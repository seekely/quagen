"use strict";
/**
 * Tests for menu module
 */

import { createGame } from "../../../../src/quagen/ui/menu";

test("createGame hits callback", async () => {
  // no location available
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { assign: jest.fn() }
  })

  // Have `fetch` grab mocked data
  const mockData = { game: { game_id: 5 } };
  const mockJsonPromise = Promise.resolve(mockData);
  const mockFetchPromise = Promise.resolve({
    status: 200,
    json: () => mockJsonPromise
  });
  global.fetch = jest.fn().mockImplementation(() => mockFetchPromise);

  await createGame(2, 2, 2);
  expect(window.location.assign).toHaveBeenCalledWith("/game/5");

  window.location.assign.mockClear();
  global.fetch.mockClear();
  delete global.fetch;
});

test("createGame misses callback", async () => {
  // no location available
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { assign: jest.fn() }
  })

  // Have `fetch` grab bad mocked data
  const mockFetchPromise = Promise.resolve({ status: 400 });
  global.fetch = jest.fn().mockImplementation(() => mockFetchPromise);

  await createGame(2, 2, 2);
  expect(window.location.assign).toHaveBeenCalledTimes(0);

  window.location.assign.mockClear();
  global.fetch.mockClear();
  delete global.fetch;
});
