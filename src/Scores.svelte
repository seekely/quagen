<script>
    import Score from './Score.svelte';

    export let players;
</script>


<div >
    This is all the scores

    <div>
        <div style="float:left;">
            <div>
                Controlled
            </div>
            <div>
                Projected
            </div>
            <div>
                Pressuring
            </div>
        </div>
        <Score />
        {#each { length: players } as _, i}
            <Score />
        {/each}
    </div>

</div>
<div style="clear:both;" />
