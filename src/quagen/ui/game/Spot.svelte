<script>
  /**
   * A single spot on the game board
   */

  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  // Coordinates of this spot on the board
  export let x;
  export let y;

  // Current color controlling this spot, -1 for none
  export let color = -1;

  // Pressures on this spot from each color
  export let pressures = [];

  // Current power level of this spot
  export let power = 0;

  // @hack rseekely should not be hard coded
  // Max possible power level
  export let maxPower = 4;

  // If the player selected this spot before moving here
  export let selected = false;

  // If a move is allowed to made on this spot
  export let allowMove = true;
  $: enabled = allowMove && power < maxPower;

  // If this spot is the current move being made by the player
  export let pendingMove = false;

  // If this spot was the last move made by any player
  export let lastMove = false;

  // Opacity of this spot determined by current power level
  $: opacity = 0 < power && power < maxPower ? (0.75 / maxPower) * power : 1;

  /**
   * Dispatches an event to the parent when this spot was selected by the
   * player. Depending on the settings, we may want to wait for a double
   * click before making this a move.
   */
  function handleSelected() {
    dispatch("selected", { x: x, y: y });
  }
</script>

<style>
  button {
    margin: 1px;
    height: 25px;
    width: 25px;
    color: white;
    font-weight: bold;
    font-size: 12px;
    text-align: center;

    padding: 0;
    border: 1px solid black;
    outline: none;
    font: inherit;
    background-color: #e7e7e7;
  }

  button:active {
    box-shadow: inset 2px 2px 6px #c1c1c1;
  }

  /* Spot pulses when hovered or touched */
  @keyframes pulse {
    25% {
      transform: scale(1.1);
    }
    75% {
      transform: scale(0.9);
    }
  }

  .selected,
  .pulse:hover,
  .pulse:active {
    animation-name: pulse;
    animation-duration: 1s;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
    opacity: 1;
  }

  .pulse:hover {
    border: 1px solid rgba(0, 0, 0, 0);
    outline: 3px solid black;
    z-index: 2;
  }

  .selected {
    background: yellow;
  }

  /* A player is trying to move here */
  .pending {
    border: 1px solid rgba(0, 0, 0, 0);
    outline: 3px solid black;
    z-index: 2;
    background: yellow;
  }

  /* A player moved here last turn */
  .last {
    border: 1px solid rgba(0, 0, 0, 0);
    outline: 3px solid black;
    z-index: 2;
  }

  /* Spot colors based on player control */
  .player-color-0 {
    background-color: #000000;
  }
  .player-color-1 {
    background-color: #008cba;
  }
  .player-color-2 {
    background-color: #f44336;
  }
  .player-color-3 {
    background-color: #16d74f;
  }
  .player-color-4 {
    background-color: #ffc300;
  }
</style>

<button
  type="button"
  on:mouseup={handleSelected}
  class="spot player-color-{color}"
  class:last={lastMove}
  class:pending={pendingMove}
  class:pulse={!pendingMove && !lastMove && enabled}
  class:selected={selected && !pendingMove && !lastMove && enabled}
  style="opacity: {opacity};"
  disabled={!enabled} />
