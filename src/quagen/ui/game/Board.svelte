<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  import Spot from "./Spot.svelte";
  import { isTouching } from "../utils.js";

  // The turn number completed this board state reflects
  export let turnCompleted = 0;

  // number of spots on the board
  export let width = 0;
  export let height = 0;

  // data for each spot on the board in the format of
  // [[{"x": 0, "y": 0}, {"x": 0, "y": 1}], [{"x": 1, "y": 0}, {"x": 1, "y": 1}]]
  export let spots = [];

  // If the game/board state allows the player to make a move
  export let allowMove = true;

  // All the past moves made in the game in the format of
  // [[(color0, x, y), (color1, x, y)]]
  export let moveHistory = [];

  // This player's selected spot on the board, or -1 if none
  $: selectedX = turnCompleted ? -1 : -1;
  $: selectedY = turnCompleted ? -1 : -1;

  // if we sent off a move from this player to the server
  $: pendingMove = turnCompleted ? false : false;

  // the last set of moves made by each player in the format of
  // [(color0, x, y), (color1, x, y)]
  $: lastMoves = moveHistory.length > 0 ? moveHistory.slice(-1)[0] : [];

  // Change the viewport of a mobile device so the whole board is visible
  // on page load
  $: containerWidth = width * 26 + 75;
  $: {
    const viewport = document.getElementById("viewport");
    if (0 < width && containerWidth > screen.width) {
      console.log("change " + containerWidth);
      viewport.setAttribute("content", `width=${containerWidth}`);
    }
  }

  /**
   * Handles when  a spot on the board has been selected by the player.
   * Depending on the settings, we may want to wait for a double
   * click before making this a move.
   */
  function handleSpotSelected(event) {
    const eventX = event.detail.x;
    const eventY = event.detail.y;

    // Short circuit getting here when a move should not be allowed according
    // to board/game state
    if (!allowMove) {
      return;
    }

    // if the player is using a mouse, let the first selection made
    // go through. if the player is using a touch screen, make them confirm
    // their selection with another click so they don't accidentally make a move
    // while scrolling/zooming.
    if (!isTouching() || (selectedX == eventX && selectedY == eventY)) {
      pendingMove = true;
      allowMove = false;
      selectedX = eventX;
      selectedY = eventY;
      dispatch("move", { x: eventX, y: eventY });
    } else {
      selectedX = eventX;
      selectedY = eventY;
    }
  }

  /**
   * if a player moved in the spot last turn
   * @param  {list} moves List of last turn's moves in format of [(x1,y1), (x2,y2)]
   * @param  {int} x coord of spot to check
   * @param  {int} y coord of spot to check
   * @return {bool} true if player moved in x,y location last turned, false otherwise
   */
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
    line-height: 1px;
  }
</style>

<div class="container" style="min-width: {containerWidth}px;">
  {#each { length: height } as _, y}
    {#each { length: width } as _, x}
      <Spot
        {x}
        {y}
        {...spots[x][y]}
        selected={selectedX == x && selectedY == y}
        {allowMove}
        lastMove={isLastMove(lastMoves, x, y)}
        pendingMove={selectedX == x && selectedY == y && pendingMove}
        on:selected={handleSpotSelected} />
    {/each}
    <br />
  {/each}
</div>
