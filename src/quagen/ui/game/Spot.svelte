<script>

    import { createEventDispatcher } from 'svelte';

    export let x; 
    export let y;
    export let allowMove = true;
    export let color = -1;
    export let power = 0;
    export let maxPower = 4;
    export let pressures = [];
    export let lastMove = false;
    $: opacity = (0 < power && power < maxPower) 
                ? (.75 / maxPower) * power
                : 1;

    $: pendingMove = lastMove ? false : false;

    $: buttonEnabled = allowMove && power < maxPower;


    const dispatch = createEventDispatcher();

    function handleMouseUp(event) {

        dispatch('move', {x: x, y: y});
        pendingMove = true;
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
        background: #e7e7e7;
    }

    button:hover, button:active {
        background:yellow;
        opacity: 1;
    }

    button:active {
        box-shadow: inset 2px 2px 6px #c1c1c1;        
    }

    .pending-move {
        outline: 3px solid black;
        outline-offset: 1px;
        z-index: 2;
    }


    .spot-color-0 {background-color: #000000;} 
    .spot-color-1 {background-color: #008cba;} 
    .spot-color-2 {background-color: #f44336;}  
    .spot-color-3 {background-color: #16d74f;}  
    .spot-color-4 {background-color: #ffc300;}  

</style>


<button type="button" on:mouseup={handleMouseUp}
        class="spot spot-color-{color}" 
        class:pending-move="{pendingMove || lastMove}" 
        style="opacity: {opacity};"
        disabled="{!buttonEnabled}" ></button>