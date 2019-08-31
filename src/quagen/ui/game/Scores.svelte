<script>
    import Score from './Score.svelte';

    export let scores = [];
</script>

<style>


</style>

<div>
    <div>
        <Score key={true} />
        {#each scores as score, i}
            <Score player={i} {...score} />
        {/each}
    </div>

</div>
<div style="clear:both;" />
