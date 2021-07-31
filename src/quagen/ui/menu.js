"use strict";

/**
 * Controller functions for the game's main menu on the home page
 */

/**
 * Sends a create game request to the backend API. Redirects the browser to
 * the new game on success.
 * @param  {Int} playerCount Number of total players to be in the game
 * @param  {Int} aiCount Number of AI players to be in the game
 * @param  {Int} aiStrength Strength of the AI. Higher is more difficult.
 */
export async function createGame(playerCount, aiCount, aiStrength) {
  // Build the request options
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      player_count: playerCount,
      ai_count: aiCount,
      ai_strength: aiStrength,
    }),
  };

  // Fire the new game request
  return fetch(`/api/v1/game/new`, options)
    .then((response) => {
      if (200 == response.status) {
        return response.json();
      } else {
        throw response.statusText;
      }
    })
    .then((data) => {
      // On successful creation of new game, redirect the browser to the game.
      const gameId = data["game"]["game_id"];
      window.location.assign(`/game/${gameId}`);
    })
    .catch(() => {
      return;
    });
}
