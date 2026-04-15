<script lang="ts">
	import type { LetterState } from '$lib/game';

	let {
		letter = '',
		state = 'empty' as LetterState,
		index = 0,
		animate = false,
		bounce = false
	}: {
		letter?: string;
		state?: LetterState;
		index?: number;
		animate?: boolean;
		bounce?: boolean;
	} = $props();

	function getAriaLabel(): string {
		if (!letter) return 'Vide';
		const stateLabels: Record<LetterState, string> = {
			correct: 'bien placée',
			misplaced: 'mal placée',
			absent: 'absente',
			empty: '',
			tbd: 'en attente'
		};
		return `${letter}, ${stateLabels[state] || 'en attente'}`;
	}
</script>

<div
	class="tile"
	class:tile-correct={state === 'correct'}
	class:tile-misplaced={state === 'misplaced'}
	class:tile-absent={state === 'absent'}
	class:tile-tbd={state === 'tbd'}
	class:tile-empty={state === 'empty'}
	class:tile-animate={animate}
	class:tile-bounce={bounce}
	class:tile-filled={letter !== ''}
	style="--delay: {index * 150}ms; --bounce-delay: {index * 80}ms"
	role="gridcell"
	aria-label={getAriaLabel()}
	aria-roledescription="lettre"
	data-testid="tile"
	data-state={state}
>
	<span class="tile-letter">{letter}</span>
</div>

<style>
	.tile {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--tile-size);
		height: var(--tile-size);
		border-radius: var(--tile-radius);
		border: 2px solid var(--color-border);
		font-size: clamp(1.2rem, 4vw, 1.6rem);
		font-weight: 700;
		text-transform: uppercase;
		user-select: none;
		transition: border-color 0.15s ease;
		perspective: 600px;
	}

	.tile-letter {
		display: block;
		backface-visibility: hidden;
	}

	.tile-empty {
		border-color: var(--color-border);
		background: var(--color-empty);
	}

	.tile-tbd {
		border-color: var(--color-border-active);
		background: var(--color-tbd);
		color: var(--color-text);
	}

	.tile-filled {
		animation: pop var(--pop-duration) ease;
	}

	.tile-correct {
		background: var(--color-correct);
		border-color: var(--color-correct);
		color: var(--color-correct-text);
		box-shadow: 0 0 12px rgba(108, 92, 231, 0.3);
	}

	.tile-misplaced {
		background: var(--color-misplaced);
		border-color: var(--color-misplaced);
		color: var(--color-misplaced-text);
		box-shadow: 0 0 12px rgba(253, 203, 110, 0.3);
	}

	.tile-absent {
		background: var(--color-absent);
		border-color: transparent;
		color: var(--color-absent-text);
	}

	.tile-animate {
		animation: flip-in var(--flip-duration) ease;
		animation-delay: var(--delay);
		animation-fill-mode: both;
	}

	.tile-bounce {
		animation: bounce 0.8s ease;
		animation-delay: var(--bounce-delay);
		animation-fill-mode: both;
	}
</style>
