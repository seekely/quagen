<script>

    export let key = false;
    export let player = 0;
    export let controlled = 0;
    export let pressuring = 0;
    export let projected = 0;

</script>

<style>
    
    div.container {
        float: left; 
        width: 100px;
        padding: 5px;       
    }    

    .bg-color-0 {background-color: #00000033;} 
    .bg-color-1 {background-color: #008cba33;} 
    .bg-color-2 {background-color: #f4433633;}  
    .bg-color-3 {background-color: #16d74f33;}  
    .bg-color-4 {background-color: #ffc30033;}  

</style>

<div class="container bg-color-{player}">

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
