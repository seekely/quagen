<script>
  /**
   * Entry point for the main menu UI on the home screen.
   */

  import { createGame } from "../menu.js";

  // Possible game difficulties for an AI opponent
  const difficulties = [
    ["Easy", 0],
    ["Medium", 1],
    ["Hard", 2],
  ];

  // Number of total players in the game
  let playerCount = 2;

  // Number of AI players in the game
  let aiCount = 0;

  // Higher AI strength means higher difficulty
  let aiStrength = 0;

  /**
   * Creates a game with a single AI opponent
   */
  function playAi() {
    aiCount = 1;
    createGame(playerCount, aiCount, aiStrength);
  }

  /**
   * Creates a game with a single human opponent
   */
  function playFriend() {
    createGame(playerCount, aiCount, aiStrength);
  }

  /**
   * Changes the AI difficulty based on player button toggle
   * @param  {Event} event DOM event from difficulty buttons
   */
  function changeDifficulty(event) {
    aiStrength = event.target.getAttribute("difficulty");
  }
</script>

<div class="container">
  <div class="block">
    <img src="/img/intro.gif" alt="Demo gif" />
  </div>

  <div class="block">
    <div class="option-ai">
      <!-- {# Start a game vs the AI #} -->
      <div>
        <button class="button-play button-ai" on:mouseup={playAi}>
          Play AI
        </button>
      </div>

      <!-- {# Buttons to change the AI difficulty #} -->
      <div class="difficulty">
        {#each difficulties as difficulty}
          <button
            class="button-difficulty"
            class:button-difficulty-selected={aiStrength == difficulty[1]}
            difficulty={difficulty[1]}
            on:mouseup={changeDifficulty}
          >
            {difficulty[0]}
          </button>
        {/each}
      </div>
    </div>

    <!-- {# Start a game vs a human #} -->
    <div class="option-friend">
      <button class="button-play button-friend" on:mouseup={playFriend}>
        Play Friend
      </button>
    </div>
  </div>
</div>

<style>
  .container {
    display: inline-flex;
    flex-wrap: wrap;
  }

  .block {
    margin-right: 1em;
  }

  .option-ai {
    margin-top: 5%;
  }

  .option-friend {
    margin-top: 8%;
  }

  button {
    cursor: pointer;
  }

  .button-play {
    border-radius: 4px;
    color: white;
    font-size: 300%;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
  }

  .button-ai {
    background: rgb(223, 117, 20);
  }

  .button-friend {
    background: rgb(28, 184, 65);
  }

  div.difficulty {
    margin-top: 0.5em;
  }

  .button-difficulty {
    color: white;
    margin-right: 0.5em;
    font-size: 125%;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
    background: rgb(223, 117, 20);
  }

  .button-difficulty-selected {
    outline: 3px dashed black;
    outline-offset: 3px;
  }
</style>
