<script>
  /**
   * Scoreboard for the current game
   */

  import Score from "./Score.svelte";

  // If the game is over 
  export let gameOver = false;

  // List of scores for each player in the format of:
  // [{"controlled": 15, "pressuring": 24}]
  export let scores = [];

  // List of leaders of the game in the format of:
  // [(color, score)]
  export let leaders = [];

  // When the game has ended with a tie score
  $: tied = gameOver && leaders.length > 0; 

  /**
   * If the player color is the outright winner of the match
   * @param  {int} color Player color
   * @param  {dict} score Player's score dictionary
   * @return {Boolean} True if the player is outright winner
   */
  function isWinner(color, scores) {
    let winner = true;
    const score = scores[color]["controlled"];

    for (let i = 0; i < scores.length; i++) {
      if (i != color && scores[i]["controlled"] >= score) {
        winner = false;
        break;
      } 
    }

    return winner;
  }

</script>

<style>
  p {
      padding: 8px;
  }

  div.container {
    white-space: nowrap;
  }

  div.gameover {
      width: 535px;
      border-radius: 5px;
      color: white;
      background-color: rgba(255,0,0,.6);
      font-weight: bold;
  }

</style>

<div>

  {#if gameOver}
    <div class="gameover">
      {#if tied}
        <p>This game has ended in a tie!</p>
      {:else}
        <p>This game has ended!</p>
      {/if}
    </div>
  {/if}

  <div class="container">
    <Score key={true} />
    {#each scores as score, i}
      <Score color={i} 
             gameOver={gameOver} 
             winner={isWinner(i, scores)} 
             {...score} />
    {/each}
  </div>
</div>
