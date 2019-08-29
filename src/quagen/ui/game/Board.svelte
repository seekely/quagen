<script>
    import Spot from './Spot.svelte';
    import  { getContext } from 'svelte';


    export let width;
    export let height;
    export let active = true; 
    export let gameId;
    const urlApi = getContext('urlApi');

    function handleMove(event) {
        console.log(event);

        const spotX = event.detail.x;
        const spotY = event.detail.y;

        active = false;
        //button.classList.add('button-pending');
        fetch(`${ urlApi }/api/v1/game/${ gameId }/move/${ spotX }/${ spotY }`,
            {
                mode: 'no-cors'
            });

    }
 

</script>

<div>
    I am board of {width} width and {height} height!
    <br />

    {#each { length: width } as _, y}
        {#each { length: width } as _, x}
            <Spot x={x} y={y} on:move={handleMove} active={active} ></Spot>
        {/each}
        <br />
    {/each}

</div>