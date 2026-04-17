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
		['.', 'W', 'X', 'C', 'V', 'B', 'N', 'BACK', 'ENTER']
	];

	function getKeyLabel(key: string): string {
		if (key === 'ENTER') return 'Valider';
		if (key === 'BACK') return 'Effacer';
		if (key === '.') return 'Point';
		return key;
	}

	function getKeyDisplay(key: string): string {
		if (key === 'ENTER') return '✓';
		if (key === 'BACK') return '⌫';
		return key;
	}

	function getStateClass(key: string): string {
		if (key === 'ENTER' || key === 'BACK' || key === '.') return '';
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
					class:key-wide={key === 'ENTER' || key === 'BACK' || key === '.'}
					class:key-special={key === 'ENTER' || key === 'BACK' || key === '.'}
					class:key-enter={key === 'ENTER'}
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
		max-width: 540px;
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
		min-width: 30px;
		flex: 1;
		max-width: 46px;
		border-radius: var(--key-radius);
		background: var(--color-key);
		color: var(--color-key-text);
		font-size: 1rem;
		font-weight: 700;
		text-transform: uppercase;
		transition:
			background-color 0.2s ease,
			color 0.2s ease,
			transform 0.12s ease,
			box-shadow 0.2s ease;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
		box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.18), 0 1px 1px rgba(0, 0, 0, 0.18);
	}

	.key:hover {
		background: var(--color-key-hover);
	}

	.key:active {
		transform: translateY(1px) scale(0.97);
		box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.18);
	}

	.key-wide {
		flex: 1.5;
		max-width: 72px;
		font-size: 1.3rem;
	}

	.key-special {
		background: var(--color-key-special);
	}

	.key-special:hover {
		background: var(--color-key-special-hover);
	}

	.key-enter {
		background: linear-gradient(135deg, #7a6bef, #6c5ce7);
		color: #ffffff;
		box-shadow:
			inset 0 -2px 0 rgba(0, 0, 0, 0.25),
			0 2px 8px rgba(108, 92, 231, 0.35);
	}

	.key-enter:hover {
		background: linear-gradient(135deg, #8d80f3, #7a6bef);
	}

	.key-correct {
		background: linear-gradient(145deg, var(--color-correct-hi), var(--color-correct));
		color: var(--color-correct-text);
		box-shadow:
			inset 0 -2px 0 rgba(0, 0, 0, 0.22),
			0 2px 8px rgba(108, 92, 231, 0.3);
	}

	.key-misplaced {
		background: linear-gradient(145deg, var(--color-misplaced-hi), var(--color-misplaced));
		color: var(--color-misplaced-text);
		box-shadow:
			inset 0 -2px 0 rgba(0, 0, 0, 0.18),
			0 2px 8px rgba(253, 203, 110, 0.3);
	}

	.key-absent {
		background: var(--color-absent);
		color: var(--color-absent-text);
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.25);
	}
</style>
