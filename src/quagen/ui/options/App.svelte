<script>

    import { createGame } from '../options.js'

    const difficulties = [
        ["Easy", 0],
        ["Medium", 1],
        ["Hard", 2]
    ];
    let playerCount = 2;
    let aiCount = 0;
    let aiStrength = 0;

    function playAi() {
        aiCount = 1;
        createGame(playerCount, aiCount, aiStrength);
    }

    function playFriend() {
        createGame(playerCount, aiCount, aiStrength);
    }

    function changeDifficulty(event) {
        aiStrength = event.target.getAttribute("difficulty");
    }

</script>

<style>

    .block {
        margin-left: 1em;
        margin-top: 1em;
    }

    .option-ai {
        margin-top: 15%;
    }

    .option-friend {
        margin-top: 25%;
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
        margin-top: .5em;
    }

    .button-difficulty {
        color: white;
        margin-right: .5em;
        font-size: 125%;
        text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
        background: rgb(223, 117, 20);
    }

    .button-difficulty-selected {
        outline: 3px dashed black;
        outline-offset: 3px;
    }


</style>

<div>

    <div class="block left">
        <img src="/static/img/intro.gif" />
    </div>

    <div class="block left">
        <div class="option-ai">
            <div>
                <button class="button-play button-ai" 
                        on:mouseup={playAi}>Play AI</button>
            </div>
            <div class="difficulty">
                {#each difficulties as difficulty}
                    <button class="button-difficulty"
                            class:button-difficulty-selected={aiStrength == difficulty[1]}
                            difficulty={difficulty[1]}
                            on:mouseup="{changeDifficulty}">
                        {difficulty[0]}
                    </button>
                {/each}
            </div>

        </div>
        <div class="option-friend">
            <button class="button-play button-friend"
                    on:mouseup={playFriend}>Play Friend</button>
        </div>
    </div>

</div>
<div class="clear" />


