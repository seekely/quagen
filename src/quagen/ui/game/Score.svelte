<script>

    export let key = false;
    export let player = 0;
    export let controlled = 0;
    export let pressuring = 0;
    export let projected = 0;

</script>

<style>
    
    div.container {
        display: inline-block; 
        padding: .5em 1em .5em 1em;
    }

    div.key {
        width: 8em;
    }    

    div.player {
        width: 4em;
        margin-left: .5em;
    }

    .bg-color-0 {background-color: rgba(0, 0, 0, .30);} 
    .bg-color-1 {background-color: rgba(0, 140, 186, .35);}
    .bg-color-2 {background-color: rgba(244, 67, 54, .35);}  
    .bg-color-3 {background-color: rgba(22, 215, 79, .35);}  
    .bg-color-4 {background-color: rgba(255, 195, 0, .35);}  

</style>


<div class="container bg-color-{player}"
     class:key={key}
     class:player={!key} >

    {#if key }
        <div>
            Controlled
        </div>
        <div>
            Projected
        </div>
        <div>
            Pressuring
        </div>
    {:else}
        <div>
            {controlled}
        </div>
        <div>
            {projected}
        </div>
        <div>
            {pressuring}
        </div>
    {/if}
    
</div>
