<script lang="ts">
	import type { TileData } from '$lib/game';
	import Tile from './Tile.svelte';

	let {
		tiles,
		animate = false,
		shake = false,
		bounce = false
	}: {
		tiles: TileData[];
		animate?: boolean;
		shake?: boolean;
		bounce?: boolean;
	} = $props();
</script>

<div class="row" class:row-shake={shake} role="row" data-testid="row">
	{#each tiles as tile, i}
		<Tile
			letter={tile.letter}
			state={tile.state}
			index={i}
			animate={animate}
			bounce={bounce}
		/>
	{/each}
</div>

<style>
	.row {
		display: flex;
		gap: var(--tile-gap);
		justify-content: center;
	}

	.row-shake {
		animation: shake 0.5s ease;
	}
</style>
