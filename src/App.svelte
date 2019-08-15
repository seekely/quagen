<script>
	export let name;
    import Board from './Board.svelte';
    import Scores from './Scores.svelte';
</script>

<style>
	h1 {
		color: purple;
	}
</style>

<h1>Hello {name}!</h1>

<Scores players={2} />
<Board height={20} width={20} />
