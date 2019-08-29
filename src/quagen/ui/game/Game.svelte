<script>
	import Board from './Board.svelte';
    import Scores from './Scores.svelte';
    import  { setContext } from 'svelte';

    setContext('urlApi', 'http://localhost:5000');

    export let gameId = 0;
    let turnCompleted = 0;
    let turnMoved = 0;
    $: active = turnCompleted <= turnMoved;


</script>

<style>
</style>

<h1>Hello everyone!</h1>

<Scores players={2} />
<Board gameId={gameId} height={20} width={20} active={active} />
