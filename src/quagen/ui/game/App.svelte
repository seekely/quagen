<script>
    import { GameState, GamePoll } from '../game.js'
    import Board from './Board.svelte';
    import Scores from './Scores.svelte';

    export let gameId = 0;

    let gameState = new GameState(gameId);
    $: init = gameState.init;
    $: allowMove = gameState.turnMoved <= gameState.turnCompleted;
    $: spots = gameState.spotsCurrent;

    const gamePoll = new GamePoll(gameState, () => {
      gameState = gameState;
    }).start();

    function handleMove(event) {
        const spotX = event.detail.x;
        const spotY = event.detail.y;

        allowMove = false;
        fetch(`/api/v1/game/${ gameId }/move/${ spotX }/${ spotY }`);
    }

    function handleProjected(event) {
        if (event.srcElement.checked) {
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

<h1>Hello everyone!</h1>

{#if init } 

  <Scores scores={gameState.scores} />

    <input type="checkbox" on:change="{handleProjected}"> See projected board

  <Board height={gameState.getSetting('dimension_x')}
         width={gameState.getSetting('dimension_y')}
         allowMove={allowMove}
         moveHistory={gameState.moveHistory}
         spots={spots} 
         on:move="{handleMove}"/>

{:else}
  <p>Loading...</p>
{/if}
