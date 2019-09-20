<script>
  /**
   * A single spot on the game board
   */

  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  // Possible background colors for a spot based on state
  const BG_COLOR_DEFAULT = [231, 231, 231];
  const BG_COLOR_SELECTED = [240, 255, 0];
  const BG_COLORS_PLAYER = [
    [0, 0, 0],
    [0, 140, 186],
    [244, 67, 54],
    [22, 215, 79],
    [255, 195, 0]
  ];

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

  // If this spot is the current move being made by the player
  export let pendingMove = false;

  // If this spot was the last move made by any player
  export let lastMove = false;

  // The background color of the button based on current state
  let buttonColor = BG_COLOR_DEFAULT;
  let buttonOpacity = 1;
  $: {
    if (selected || pendingMove) {
      buttonColor = BG_COLOR_SELECTED;
      buttonOpacity = 1;
    } else if (0 <= color) {
      buttonColor = BG_COLORS_PLAYER[color];
      buttonOpacity =
        0 < power && power < maxPower ? (0.75 / maxPower) * power : 1;
    } else {
      buttonColor = BG_COLOR_DEFAULT;
      buttonOpacity = 1;
    }
  }

  // If the button should be enabled at all based on current state
  $: buttonEnabled = allowMove && power < maxPower;

  /**
   * Dispatches an event to the parent when this spot was selected by the
   * player. Depending on the settings, we may want to wait for a double
   * click before making this a move.
   */
  function handleSelected() {
    dispatch("selected", { x: x, y: y });
  }

  /**
   * Creates a CSS rgba() string
   * @param  {list} color expressed as [r,g,b]
   * @param  {float} opactiy expressed as float from 0 - 1
   * @return {string} rgba(r,g,b,opacity)
   */
  function toRGBA(color, opacity) {
    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`;
  }
</script>

<style>
  button,
  button:disabled,
  button[disabled] {
    margin: 1px;
    padding: 0px;
    height: 25px;
    width: 25px;

    color: white;
    font: inherit;
    font-weight: bold;
    font-size: 12px;
    text-align: center;

    border: 1px solid black;
    outline: none;
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
  .pulse:hover {
    animation-name: pulse;
    animation-duration: 1s;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
  }

  /* Outline a spot to indicate a move */
  .outline,
  .pulse:hover {
    z-index: 2;
    border: 1px solid rgba(0, 0, 0, 0) !important;
    outline: 3px solid black !important;
  }
</style>

<button
  type="button"
  on:mouseup={handleSelected}
  class:outline={lastMove || pendingMove || selected}
  class:pulse={!pendingMove && !lastMove && buttonEnabled}
  class:selected={selected && !pendingMove && !lastMove && buttonEnabled}
  style="background-color: {toRGBA(buttonColor, buttonOpacity)};"
  disabled={!buttonEnabled} />
