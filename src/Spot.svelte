<script>

    import { createEventDispatcher } from 'svelte';

    export let x; 
    export let y;
    export let pending = false;
    export let active = true;

    const dispatch = createEventDispatcher();

    function handleMouseUp(event) {

        dispatch('move', {x: x, y: y});
        console.log(event);
        console.log(this);
        console.log(this.classList);
        pending = true;
    }

</script>

<style>
    button, button:disabled {
        margin: 1px;
        height: 25px;
        width: 25px;
        color: white;
        font-weight: bold;
        font-size: 12px;
        text-align: center;
    }

    button:active {
        background:yellow;
        opacity: 1;
    }

    .pending {
        outline: 3px solid black;
        outline-offset: 1px;
        z-index: 2;
    }

</style>


<button type="button" on:mouseup={handleMouseUp}
        class="spot" 
        class:pending="{pending}" 
        disabled="{!active}" ></button>