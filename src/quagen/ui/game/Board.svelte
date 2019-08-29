<script>
    import Spot from './Spot.svelte';

    export let init = false
    export let allowMove = true; 
    export let width = 20;
    export let height = 20;
    export let moveHistory = {};
    export let spotsCurrent = [];
    export let spotsProjected = [];

    function handleMove(event) {
        const spotX = event.detail.x;
        const spotY = event.detail.y;

        allowMove = false;
        fetch(`/api/v1/game/${ gameId }/move/${ spotX }/${ spotY }`, 
            {
                mode: 'no-cors'
            }
        );
    }
 

</script>

<div>
    {#if init } 
        {#each { length: width } as _, y}
            {#each { length: width } as _, x}
                <Spot x={x} y={y} on:move={handleMove} allowMove={allowMove} ></Spot>
            {/each}
            <br />
        {/each}
    {:else}
        <p>Loading...</p>
    {/if}
</div>