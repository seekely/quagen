<script>
    import Score from './Score.svelte';

    export let scores = [];
</script>

<style>

    div.container {
        white-space: nowrap;
    }

</style>

<div>
    <div class="container">
        <Score key={true} />
        {#each scores as score, i}
            <Score player={i} {...score} />
        {/each}
    </div>

</div>
