<script>
  /**
   * Entry point for the game UI and lays out the top level UI components.
   */

  import { GameState, GamePoll } from "../game.js";
  import Board from "./Board.svelte";
  import Scores from "./Scores.svelte";
  import Settings from "./Settings.svelte";
  import StartPrompt from "./StartPrompt.svelte";

  // Unique string id for this game
  export let gameId = 0;

  // Contains the current game data/state as retrieved from the backend API
  let gameState = new GameState(gameId);

  // The spot our player has chosen to play
  let submittedSpotX;
  let submittedSpotY;

  // If the game state has completed the initial population from the
  // backend API -- don't want to show some elements until data exists.
  $: init = gameState.init;

  // If the game has ended and no more play is allowed. This propagates
  // to various components so an end game state can be shown.
  $: gameOver = gameState.completed;

  // Number of turns completed/processed in this game.
  $: turnCompleted = gameState.turnCompleted;

  // If the player should be allowed to make a move on the board
  $: allowMove = !submittedSpotX && !gameOver && gameState.timeStarted > 0;

  // The data representation for every spot on the board -- the player can
  // toggle different views (e.g. looking at the projected board).
  $: spots = gameState.spotsCurrent;

  // The opponent has moved if a move other than ours is present
  $: opponentSubmittedMove = gameState.turnMoves[gameState.playerId]
    ? Object.keys(gameState.turnMoves).length >= 2
    : Object.keys(gameState.turnMoves).length >= 1;

  // Fires off a repeated call to the backend API to grab the latest game
  // state. Yes, this should be sockets instead of short polling.
  const gamePoll = new GamePoll(gameState, () => {
    // Lets Svelte know the game state has changed so it can re-evaulate
    // all related data bindings.
    gameState = gameState;

    if (gameState.turnMoves)
      updateSubmittedSpot();
  });
  gamePoll.start();

  /**
   * Update our submitted spot coordinates if the game state indicates
   * our player has made their move
   */
  function updateSubmittedSpot() {
    submittedSpotX = undefined;
    submittedSpotY = undefined;

    const playerMove = gameState.turnMoves[gameState.playerId];
    if (!playerMove)
      return;

    submittedSpotX = playerMove[0];
    submittedSpotY = playerMove[1];
  }

  /**
   * Fires off a player move request to the backend API initiated from
   * a player interacting with the board.
   * @param  {Event} event Custom event dispatched from the game board
   */
  function handleMove(event) {
    const spotX = event.detail.x;
    const spotY = event.detail.y;
    allowMove = false;
    fetch(`/api/v1/game/${gameId}/move/${spotX}/${spotY}`);
  }

  /**
   * Toggled the player's view of the board between the current game board
   * and the projected board state.
   * @param  {Event} event DOM event
   */
  function handleProjected(event) {
    if (event.target.checked) {
      allowMove = false;
      spots = gameState.spotsProjected;
    } else {
      allowMove = true;
      spots = gameState.spotsCurrent;
    }
  }
</script>

<style>
  .board-header {
    margin-top: 1rem;
    display: flex;
    align-items: center;
  }

  .opponent-status {
    margin-left: 2rem;
    font-size: 0.9rem;
    color: rgba(0, 0, 0, 0.5);
  }
</style>

{#if init}

  <!-- {# Prompt the players with instructions at start of game #} -->
  {#if turnCompleted == 0}
    <StartPrompt gameId={gameState.gameId} vsHumans={gameState.isVsHuman()} />
    <!-- {# Otherwise, show the score of the game once a turn has finished #} -->
  {:else}
    <Scores {gameOver} scores={gameState.scores} />
  {/if}

  <div class="board-header">
    <Settings on:change={handleProjected} />
    {#if opponentSubmittedMove}
      <div class="opponent-status">
        Opponent is ready
      </div>
    {/if}
  </div>

  <Board
    height={gameState.getSetting('dimension_x')}
    width={gameState.getSetting('dimension_y')}
    moveHistory={gameState.moveHistory}
    {allowMove}
    {spots}
    {turnCompleted}
    {submittedSpotX}
    {submittedSpotY}
    on:move={handleMove} />
{:else}

  <p>Loading...</p>
{/if}