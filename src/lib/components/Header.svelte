<script lang="ts">
	let {
		onShowRules,
		onShowStats,
		attemptsUsed = 0,
		maxAttempts = 6,
		gameStatus = 'playing' as 'playing' | 'won' | 'lost'
	}: {
		onShowRules: () => void;
		onShowStats: () => void;
		attemptsUsed?: number;
		maxAttempts?: number;
		gameStatus?: 'playing' | 'won' | 'lost';
	} = $props();

	function dotClass(i: number): string {
		if (i < attemptsUsed) {
			if (gameStatus === 'won' && i === attemptsUsed - 1) return 'dot dot-win';
			return 'dot dot-used';
		}
		return 'dot';
	}
</script>

<header class="header">
	<button class="header-btn" onclick={onShowRules} aria-label="Règles du jeu">
		<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="12" cy="12" r="10"/>
			<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
			<line x1="12" y1="17" x2="12.01" y2="17"/>
		</svg>
	</button>

	<div class="brand">
		<h1 class="title" aria-label="SUTOM">
			<span class="title-letter" style="--i:0">S</span>
			<span class="title-letter" style="--i:1">U</span>
			<span class="title-letter" style="--i:2">T</span>
			<span class="title-letter" style="--i:3">O</span>
			<span class="title-letter" style="--i:4">M</span>
		</h1>
		<div class="dots" aria-label="Essais utilisés : {attemptsUsed} sur {maxAttempts}">
			{#each Array.from({ length: maxAttempts }, (_, i) => i) as i}
				<span class={dotClass(i)}></span>
			{/each}
		</div>
	</div>

	<button class="header-btn" onclick={onShowStats} aria-label="Statistiques">
		<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
			<line x1="18" y1="20" x2="18" y2="10"/>
			<line x1="12" y1="20" x2="12" y2="4"/>
			<line x1="6" y1="20" x2="6" y2="14"/>
		</svg>
	</button>
</header>

<style>
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: var(--header-height);
		padding: 0 14px;
		border-bottom: 1px solid var(--color-border);
		background: rgba(11, 6, 22, 0.72);
		backdrop-filter: blur(14px) saturate(140%);
		-webkit-backdrop-filter: blur(14px) saturate(140%);
		position: relative;
		z-index: 10;
	}

	.header-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: var(--color-surface);
		color: var(--color-text-muted);
		transition: transform 0.2s var(--ease-spring), background 0.2s ease, color 0.2s ease;
	}

	.header-btn:hover {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	.header-btn:active {
		transform: scale(0.92);
	}

	.brand {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.title {
		display: flex;
		gap: 3px;
		font-size: 1.65rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		line-height: 1;
	}

	.title-letter {
		display: inline-block;
		background: linear-gradient(
			135deg,
			#e84393 0%,
			#a29bfe 40%,
			#6c5ce7 70%,
			#fdcb6e 100%
		);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		animation: float-y 3.6s ease-in-out infinite;
		animation-delay: calc(var(--i) * 0.12s);
	}

	.dots {
		display: flex;
		gap: 5px;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.18);
		transition: background 0.3s ease, transform 0.3s ease;
	}

	.dot-used {
		background: var(--color-accent);
	}

	.dot-win {
		background: #fdcb6e;
		transform: scale(1.3);
		box-shadow: 0 0 8px rgba(253, 203, 110, 0.6);
	}
</style>
