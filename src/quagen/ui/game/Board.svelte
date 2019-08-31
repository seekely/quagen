<script>
    import Spot from './Spot.svelte';

    export let allowMove = true; 
    export let width = 0;
    export let height = 0;
    export let spots = [];
    export let moveHistory = [];
    $: lastMoves = moveHistory.length > 0 
                ? moveHistory.slice(-1)[0]
                : [];

    function isLastMove(moves, x, y) {

      for (let move of moves) {
        if (x == move[0] && y == move[1]) {
          return true;
        }
      }

      return false;

    }
 

</script>

<style>

  div.container {
    margin-top: 1em;
  }

</style>

<div class="container">
    {#each { length: height } as _, y}
        {#each { length: width } as _, x}
            <Spot x={x} 
                  y={y} 
                  allowMove={allowMove} 
                  lastMove={isLastMove(lastMoves, x, y)}
                  {...spots[x][y]}
                  on:move></Spot>
        {/each}
        <br />
    {/each}
</div>