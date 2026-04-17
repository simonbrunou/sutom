<script lang="ts">
	import type { TileData } from '$lib/game';
	import Tile from './Tile.svelte';

	let {
		tiles,
		animate = false,
		shake = false,
		bounce = false,
		initialLetter = ''
	}: {
		tiles: TileData[];
		animate?: boolean;
		shake?: boolean;
		bounce?: boolean;
		initialLetter?: string;
	} = $props();

	// A row is "unsubmitted" if its first tile is not yet evaluated.
	const isUnsubmitted = $derived(
		tiles.length > 0 && (tiles[0].state === 'empty' || tiles[0].state === 'tbd')
	);
</script>

<div class="row" class:row-shake={shake} role="row" data-testid="row">
	{#each tiles as tile, i}
		{#if i === 0 && isUnsubmitted && initialLetter}
			<Tile letter={initialLetter} state="tbd" index={0} animate={false} bounce={bounce} initial={true} />
		{:else}
			<Tile letter={tile.letter} state={tile.state} index={i} animate={animate} bounce={bounce} />
		{/if}
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
