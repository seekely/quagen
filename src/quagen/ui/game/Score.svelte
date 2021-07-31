<script>
  /**
   * Displays the score for a single player
   */

  // This scoreboard entry is serving as the key and not a player score
  export let key = false;

  // The player color owning this score
  export let color = 0;

  // If the game has ended
  export let gameOver = false;

  // If this player is the outright winner of the game
  export let winner = false;

  // We give the winner of the game a crown
  $: crown = gameOver && winner;

  // The player's current scores
  export let controlled = 0;
  export let pressuring = 0;
  export let projected = 0;
</script>

<div class="container">
  {#if crown}
    <div class="crown">
      <img src="/img/crown.png" width="35px" alt="Crown!" />
    </div>
  {/if}

  <div class="inner bg-color-{color}" class:crown class:key class:player={!key}>
    {#if key}
      <div>Controlled</div>
      <div>Projected</div>
      <div>Pressuring</div>
    {:else}
      <div>{controlled}</div>
      <div>{projected}</div>
      <div>{pressuring}</div>
    {/if}
  </div>
</div>

<style>
  div.container {
    display: inline-block;
  }

  div.crown {
    padding: 0em 0em 0.2em 1.3em;
  }

  div.inner {
    padding: 0.5em 1em 0.5em 1em;
    border: 1px dashed black;
    text-align: center;
  }

  div.key {
    width: 8em;
    border-radius: 4px;
    color: black;
    font-weight: bolder;
  }

  div.player {
    width: 4em;
    border-radius: 4px;
    margin-left: 0.5em;
    color: black;
    font-weight: bold;
  }

  .bg-color-0 {
    background-color: rgba(0, 0, 0, 0.3);
  }
  .bg-color-1 {
    background-color: rgba(0, 140, 186, 0.35);
  }
  .bg-color-2 {
    background-color: rgba(244, 67, 54, 0.35);
  }
  .bg-color-3 {
    background-color: rgba(22, 215, 79, 0.35);
  }
  .bg-color-4 {
    background-color: rgba(255, 195, 0, 0.35);
  }

  /* Div pulses when winner is declared */
  @keyframes crown {
    25% {
      transform: scale(1.05);
    }
    75% {
      transform: scale(1);
    }
  }

  .crown {
    animation-name: crown;
    animation-duration: 2s;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
  }
</style>
