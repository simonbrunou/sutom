<script lang="ts">
	import type { LetterState } from '$lib/game';

	let {
		letter = '',
		state = 'empty' as LetterState,
		index = 0,
		animate = false,
		bounce = false,
		initial = false
	}: {
		letter?: string;
		state?: LetterState;
		index?: number;
		animate?: boolean;
		bounce?: boolean;
		initial?: boolean;
	} = $props();

	function getAriaLabel(): string {
		if (initial) return `${letter}, lettre donnée`;
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
	class:tile-correct={!initial && state === 'correct'}
	class:tile-misplaced={!initial && state === 'misplaced'}
	class:tile-absent={!initial && state === 'absent'}
	class:tile-tbd={state === 'tbd' || initial}
	class:tile-empty={!initial && state === 'empty'}
	class:tile-animate={animate && !initial}
	class:tile-bounce={bounce}
	class:tile-filled={letter !== '' && state === 'tbd' && !initial}
	style="--delay: {index * 150}ms; --bounce-delay: {index * 80}ms"
	role="gridcell"
	aria-label={getAriaLabel()}
	aria-roledescription="lettre"
	data-testid="tile"
	data-state={initial ? 'initial' : state}
>
	<span class="tile-letter">{letter}</span>
</div>

<style>
	.tile {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--tile-size);
		height: var(--tile-size);
		border-radius: var(--tile-radius);
		border: 2px solid var(--color-border);
		font-size: clamp(1.25rem, 4.2vw, 1.7rem);
		font-weight: 800;
		text-transform: uppercase;
		user-select: none;
		transition:
			border-color 0.2s ease,
			background-color 0.2s ease,
			transform 0.2s ease;
		perspective: 800px;
		will-change: transform;
	}

	.tile-letter {
		display: block;
		backface-visibility: hidden;
		line-height: 1;
		letter-spacing: 0.02em;
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
		animation: pop var(--pop-duration) var(--ease-spring);
	}

	.tile-correct {
		background: linear-gradient(145deg, var(--color-correct-hi), var(--color-correct));
		border-color: var(--color-correct);
		color: var(--color-correct-text);
		box-shadow:
			0 4px 14px rgba(108, 92, 231, 0.35),
			inset 0 1px 0 rgba(255, 255, 255, 0.18);
	}

	.tile-misplaced {
		background: linear-gradient(145deg, var(--color-misplaced-hi), var(--color-misplaced));
		border-color: var(--color-misplaced);
		color: var(--color-misplaced-text);
		box-shadow:
			0 4px 14px rgba(253, 203, 110, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.35);
	}

	.tile-absent {
		background: var(--color-absent);
		border-color: transparent;
		color: var(--color-absent-text);
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
	}

.tile-animate {
		animation: flip-in var(--flip-duration) var(--ease-out);
		animation-delay: var(--delay);
		animation-fill-mode: both;
	}

	.tile-bounce {
		animation: bounce 0.9s var(--ease-spring);
		animation-delay: var(--bounce-delay);
		animation-fill-mode: both;
	}
</style>
