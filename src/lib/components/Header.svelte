<script lang="ts">
	let { onShowRules, onShowStats }: { onShowRules: () => void; onShowStats: () => void } =
		$props();
</script>

<header class="header">
	<button class="header-btn" onclick={onShowRules} aria-label="Règles du jeu">
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="12" cy="12" r="10"/>
			<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
			<line x1="12" y1="17" x2="12.01" y2="17"/>
		</svg>
	</button>

	<h1 class="title">
		<span class="title-letter" style="--i:0">S</span>
		<span class="title-letter" style="--i:1">U</span>
		<span class="title-letter" style="--i:2">T</span>
		<span class="title-letter" style="--i:3">O</span>
		<span class="title-letter" style="--i:4">M</span>
	</h1>

	<button class="header-btn" onclick={onShowStats} aria-label="Statistiques">
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
		padding: 0 16px;
		border-bottom: 1px solid var(--color-border);
		background: rgba(15, 10, 26, 0.8);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
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
		transition: all 0.2s ease;
	}

	.header-btn:hover {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	.title {
		display: flex;
		gap: 4px;
		font-size: 1.6rem;
		font-weight: 800;
		letter-spacing: 0.08em;
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
		animation: float 3s ease-in-out infinite;
		animation-delay: calc(var(--i) * 0.1s);
	}

	@keyframes float {
		0%, 100% { transform: translateY(0px); }
		50% { transform: translateY(-2px); }
	}
</style>
