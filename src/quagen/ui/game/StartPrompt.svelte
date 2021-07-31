<script>
  /**
   * Information prompt at the start of the game
   */

  // Unique id of the game
  export let gameId = 0;

  // If the game has at least one other human player
  export let vsHumans = false;

  // Url to share this game with others
  $: shareUrl = `${window.location.protocol}//${window.location.host}/game/${gameId}`;

  /**
   * Highlight and copy to clipboard the share url on click
   */
  function handleShare() {
    // highlight share url
    const shareElm = document.getElementById("share-url");

    const range = document.createRange();
    range.selectNodeContents(shareElm);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    // copy share url to clipboard
    document.execCommand("copy");
  }
</script>

<div>
  {#if vsHumans}
    <p>
      The game will start after all players have made their first move. To
      invite a friend to the game, share the following link:
    </p>
    <p class="share" on:mouseup={handleShare}>
      <span id="share-url">{shareUrl}</span>
    </p>
  {:else}
    <p>The game will start when you make your first move.</p>
  {/if}
</div>

<style>
  div {
    width: 535px;
    border-radius: 5px;
    color: white;
    background-color: rgba(255, 0, 0, 0.6);
    font-weight: bold;
  }

  p {
    padding: 8px;
    margin-bottom: 0px;
  }

  p.share {
    margin-top: 2px;
    color: yellow;
  }

  p.share span {
    padding: 4px;
    border-radius: 5px;
    border-color: black;
    border-style: dashed;
  }
</style>
