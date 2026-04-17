<script lang="ts">
	import type { TileData } from '$lib/game';
	import Row from './Row.svelte';

	let {
		grid,
		currentRowIndex = 0,
		shakeRow = -1,
		bounceRow = -1,
		initialLetter = ''
	}: {
		grid: TileData[][];
		currentRowIndex?: number;
		shakeRow?: number;
		bounceRow?: number;
		initialLetter?: string;
	} = $props();
</script>

<div class="board" role="grid" aria-label="Grille de jeu" data-testid="board" id="game">
	{#each grid as row, i}
		<Row
			tiles={row}
			animate={i < currentRowIndex}
			shake={i === shakeRow}
			bounce={i === bounceRow}
			{initialLetter}
		/>
	{/each}
</div>

<style>
	.board {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--tile-gap);
		padding: 16px 8px;
	}
</style>
