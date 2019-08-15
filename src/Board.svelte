<script>
    import Spot from './Spot.svelte';

    export let width;
    export let height;

</script>

<div>
    I am board of {width} width and {height} height!
    <br />

    {#each { length: width } as _, y}
        {#each { length: width } as _, x}
            <Spot></Spot>
        {/each}
        <br />
    {/each}

</div>