<script>
  import { GameState, GamePoll } from "../game.js";
  import Board from "./Board.svelte";
  import Scores from "./Scores.svelte";
  import Settings from "./Settings.svelte";
  import StartPrompt from "./StartPrompt.svelte";

  export let gameId = 0;

  let gameState = new GameState(gameId);
  $: init = gameState.init;
  $: gameOver = gameState.completed;
  $: allowMove = !gameOver && gameState.turnMoved <= gameState.turnCompleted;
  $: spots = gameState.spotsCurrent;
  $: turnCompleted = gameState.turnCompleted;

  const gamePoll = new GamePoll(gameState, () => {
    gameState = gameState;
  });
  gamePoll.start();

  function handleMove(event) {
    const spotX = event.detail.x;
    const spotY = event.detail.y;
    allowMove = false;
    fetch(`/api/v1/game/${gameId}/move/${spotX}/${spotY}`);
  }

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

</style>

{#if init}
  
  {#if 0 < turnCompleted}
    <Scores gameOver={gameOver} scores={gameState.scores} />
  {:else}
    <StartPrompt gameId={gameState.gameId} vsHumans={gameState.isVsHuman()} />
  {/if}

  <Settings on:change={handleProjected} />

  <Board
    turnCompleted={turnCompleted}
    height={gameState.getSetting('dimension_x')}
    width={gameState.getSetting('dimension_y')}
    {allowMove}
    moveHistory={gameState.moveHistory}
    {spots}
    on:move={handleMove} />
{:else}
  <p>Loading...</p>
{/if}
