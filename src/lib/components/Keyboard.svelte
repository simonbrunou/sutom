<script lang="ts">
	import type { LetterState } from '$lib/game';

	let {
		keyStates = {} as Record<string, LetterState>,
		onKey
	}: {
		keyStates?: Record<string, LetterState>;
		onKey: (key: string) => void;
	} = $props();

	// AZERTY layout
	const rows = [
		['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
		['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
		['ENTER', 'W', 'X', 'C', 'V', 'B', 'N', 'BACK']
	];

	function getKeyLabel(key: string): string {
		if (key === 'ENTER') return 'Valider';
		if (key === 'BACK') return 'Effacer';
		return key;
	}

	function getKeyDisplay(key: string): string {
		if (key === 'ENTER') return '✓';
		if (key === 'BACK') return '⌫';
		return key;
	}

	function getStateClass(key: string): string {
		if (key === 'ENTER' || key === 'BACK') return '';
		const state = keyStates[key];
		if (state) return `key-${state}`;
		return '';
	}
</script>

<div class="keyboard" role="group" aria-label="Clavier" data-testid="keyboard">
	{#each rows as row}
		<div class="keyboard-row">
			{#each row as key}
				<button
					class="key {getStateClass(key)}"
					class:key-wide={key === 'ENTER' || key === 'BACK'}
					class:key-special={key === 'ENTER' || key === 'BACK'}
					onclick={() => onKey(key)}
					aria-label={getKeyLabel(key)}
					data-testid="key-{key}"
					data-key={key}
				>
					{getKeyDisplay(key)}
				</button>
			{/each}
		</div>
	{/each}
</div>

<style>
	.keyboard {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 0 4px;
		width: 100%;
		max-width: 520px;
		margin: 0 auto;
	}

	.keyboard-row {
		display: flex;
		gap: 5px;
		width: 100%;
		justify-content: center;
	}

	.key {
		display: flex;
		align-items: center;
		justify-content: center;
		height: var(--key-height);
		min-width: 32px;
		flex: 1;
		max-width: 44px;
		border-radius: var(--key-radius);
		background: var(--color-key);
		color: var(--color-key-text);
		font-size: 0.95rem;
		font-weight: 600;
		text-transform: uppercase;
		transition: all 0.2s ease;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}

	.key:active {
		transform: scale(0.95);
	}

	.key-wide {
		flex: 1.5;
		max-width: 68px;
		font-size: 1.2rem;
	}

	.key-special {
		background: var(--color-key-special);
	}

	.key-correct {
		background: var(--color-correct);
		color: var(--color-correct-text);
	}

	.key-misplaced {
		background: var(--color-misplaced);
		color: var(--color-misplaced-text);
	}

	.key-absent {
		background: var(--color-absent);
		color: var(--color-absent-text);
	}
</style>
