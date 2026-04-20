<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		createInitialState,
		addLetter,
		removeLetter,
		submitGuess,
		evaluateGuess,
		getGridData,
		getKeyboardState,
		getDailyWord,
		type GameState
	} from '$lib/game';
	import { ANSWER_WORDS, isValidWord } from '$lib/words';
	import Header from '$lib/components/Header.svelte';
	import Board from '$lib/components/Board.svelte';
	import Keyboard from '$lib/components/Keyboard.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Toast from '$lib/components/Toast.svelte';

	let gameState: GameState = $state(createInitialState(getDailyWord(ANSWER_WORDS)));
	let shakeRow = $state(-1);
	let bounceRow = $state(-1);
	let toastMessage = $state('');
	let toastVisible = $state(false);
	let toastVariant = $state<'default' | 'success' | 'error' | 'info'>('default');
	let showRules = $state(false);
	let showStats = $state(false);
	let showConfetti = $state(false);
	let countdown = $state('');
	let toastTimeout: ReturnType<typeof setTimeout> | undefined;
	let countdownInterval: ReturnType<typeof setInterval> | undefined;

	const grid = $derived(getGridData(gameState));
	const keyStates = $derived(getKeyboardState(gameState.guesses, gameState.solution));
	const currentRowIndex = $derived(gameState.guesses.length);
	const initialLetter = $derived(gameState.solution[0] ?? '');

	// Precomputed confetti bits so we don't re-randomize on each render
	const confettiPieces = Array.from({ length: 60 }, (_, i) => ({
		left: Math.random() * 100,
		delay: Math.random() * 0.6,
		duration: 2.2 + Math.random() * 1.6,
		color: ['#6c5ce7', '#a29bfe', '#e84393', '#fdcb6e', '#ff6ab0'][i % 5],
		size: 6 + Math.floor(Math.random() * 6),
		rotate: Math.floor(Math.random() * 360)
	}));

	function haptic(pattern: number | number[]) {
		try {
			if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
				navigator.vibrate(pattern);
			}
		} catch {
			// ignore
		}
	}

	function showToast(msg: string, duration = 2000, variant: typeof toastVariant = 'default') {
		if (toastTimeout) clearTimeout(toastTimeout);
		toastMessage = msg;
		toastVariant = variant;
		toastVisible = true;
		toastTimeout = setTimeout(() => {
			toastVisible = false;
		}, duration);
	}

	function formatDateFR(date: Date): string {
		return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
	}

	function buildShareText(): string {
		const attemptStr =
			gameState.gameStatus === 'won'
				? `${gameState.guesses.length}/${gameState.maxAttempts}`
				: `X/${gameState.maxAttempts}`;
		const dateStr = formatDateFR(new Date());
		const lines = gameState.guesses.map((g) => {
			const tiles = evaluateGuess(g, gameState.solution);
			return tiles
				.map((t) => {
					if (t.state === 'correct') return '🟪';
					if (t.state === 'misplaced') return '🟨';
					return '⬛';
				})
				.join('');
		});
		return `SUTOM - ${dateStr}\n${attemptStr}\n\n${lines.join('\n')}`;
	}

	const emojiGrid = $derived(
		gameState.guesses.map((g) =>
			evaluateGuess(g, gameState.solution)
				.map((t) => (t.state === 'correct' ? '🟪' : t.state === 'misplaced' ? '🟨' : '⬛'))
				.join('')
		)
	);

	async function shareResult() {
		const text = buildShareText();
		if (typeof navigator !== 'undefined' && navigator.share) {
			try {
				await navigator.share({ text });
				return;
			} catch (err) {
				if (err instanceof Error && err.name === 'AbortError') return;
			}
		}
		if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
			try {
				await navigator.clipboard.writeText(text);
				showToast('Copié dans le presse-papier', 2000, 'success');
				return;
			} catch {
				// fall through
			}
		}
		window.prompt('Copiez ce texte :', text);
	}

	function updateCountdown() {
		const now = new Date();
		const tomorrow = new Date(now);
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(0, 0, 0, 0);
		const diff = tomorrow.getTime() - now.getTime();
		const h = Math.floor(diff / 3_600_000);
		const m = Math.floor((diff % 3_600_000) / 60_000);
		const s = Math.floor((diff % 60_000) / 1000);
		countdown = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

		const todayWord = getDailyWord(ANSWER_WORDS);
		if (todayWord !== gameState.solution) {
			gameState = createInitialState(todayWord);
		}
	}

	function triggerConfetti() {
		showConfetti = true;
		setTimeout(() => (showConfetti = false), 4200);
	}

	function handleKey(key: string) {
		if (gameState.gameStatus !== 'playing') return;

		if (key === 'ENTER') {
			if (gameState.currentGuess.length < gameState.solution.length) {
				showToast('Pas assez de lettres', 1800, 'info');
				shakeRow = currentRowIndex;
				haptic(40);
				setTimeout(() => (shakeRow = -1), 600);
				return;
			}
			if (!isValidWord(gameState.currentGuess)) {
				showToast('Mot non reconnu', 1800, 'error');
				shakeRow = currentRowIndex;
				haptic([30, 40, 30]);
				setTimeout(() => (shakeRow = -1), 600);
				return;
			}
			gameState = submitGuess(gameState);

			if (gameState.gameStatus === 'won') {
				const messages = ['Génial !', 'Magnifique !', 'Superbe !', 'Bien joué !', 'De justesse !', 'Ouf !'];
				const idx = Math.min(gameState.guesses.length - 1, messages.length - 1);
				bounceRow = gameState.guesses.length - 1;
				const animDelay = gameState.solution.length * 150 + 500;
				setTimeout(() => {
					showToast(messages[idx], 3000, 'success');
					bounceRow = -1;
					triggerConfetti();
					haptic([40, 50, 40, 50, 80]);
				}, animDelay);
				setTimeout(() => {
					if (gameState.gameStatus !== 'playing') showStats = true;
				}, animDelay + 2000);
			} else if (gameState.gameStatus === 'lost') {
				// Capture solution now; a midnight-rollover reset during animDelay
				// would otherwise leak tomorrow's word into the reveal toast.
				const revealedSolution = gameState.solution;
				const animDelay = revealedSolution.length * 150 + 500;
				setTimeout(() => {
					showToast(`Le mot était : ${revealedSolution}`, 5000, 'error');
					haptic([100, 50, 100]);
				}, animDelay);
				setTimeout(() => {
					if (gameState.gameStatus !== 'playing') showStats = true;
				}, animDelay + 2000);
			} else {
				haptic(15);
			}
			return;
		}

		if (key === 'BACK') {
			gameState = removeLetter(gameState);
			haptic(8);
			return;
		}

		if (/^[A-Z]$/.test(key) || key === '.') {
			gameState = addLetter(gameState, key);
			haptic(5);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (showRules || showStats) return;
		if (e.ctrlKey || e.metaKey || e.altKey) return;

		const key = e.key.toUpperCase();

		if (key === 'ENTER') {
			e.preventDefault();
			handleKey('ENTER');
		} else if (key === 'BACKSPACE') {
			e.preventDefault();
			handleKey('BACK');
		} else if (/^[A-Z]$/.test(key)) {
			e.preventDefault();
			handleKey(key);
		} else if (e.key === '.') {
			e.preventDefault();
			handleKey('.');
		}
	}

	onMount(() => {
		try {
			const saved = localStorage.getItem('sutom-state');
			if (saved) {
				const parsed = JSON.parse(saved);
				const todayWord = getDailyWord(ANSWER_WORDS);
				if (parsed.solution === todayWord) {
					gameState = parsed;
				}
			}
		} catch {
			// Ignore parse errors
		}
		updateCountdown();
		countdownInterval = setInterval(updateCountdown, 1000);
	});

	onDestroy(() => {
		if (countdownInterval) clearInterval(countdownInterval);
		if (toastTimeout) clearTimeout(toastTimeout);
	});

	$effect(() => {
		try {
			localStorage.setItem('sutom-state', JSON.stringify(gameState));
		} catch {
			// Ignore storage errors
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="game-container">
	<Header
		onShowRules={() => (showRules = true)}
		onShowStats={() => (showStats = true)}
		attemptsUsed={gameState.guesses.length}
		maxAttempts={gameState.maxAttempts}
		gameStatus={gameState.gameStatus}
	/>

	<main class="game-main">
		<div class="board-container">
			<Board {grid} {currentRowIndex} {shakeRow} {bounceRow} {initialLetter} />
		</div>

		<div class="keyboard-container">
			<Keyboard {keyStates} onKey={handleKey} />
		</div>
	</main>

	{#if showConfetti}
		<div class="confetti" aria-hidden="true">
			{#each confettiPieces as p, i (i)}
				<span
					class="confetti-piece"
					style="left:{p.left}%; background:{p.color}; width:{p.size}px; height:{p.size * 1.6}px; animation-delay:{p.delay}s; animation-duration:{p.duration}s; transform:rotate({p.rotate}deg);"
				></span>
			{/each}
		</div>
	{/if}

	<Toast message={toastMessage} visible={toastVisible} variant={toastVariant} />

	<Modal open={showRules} title="Comment jouer" onClose={() => (showRules = false)}>
		<div class="rules">
			<p>Trouvez le mot du jour en <strong>6 essais</strong>.</p>
			<p>La <strong>première lettre</strong> vous est offerte. Chaque essai doit être un mot valide.</p>

			<div class="rules-section">
				<h3>Indices</h3>
				<div class="rule-example">
					<div class="example-tile initial">S</div>
					<span>Lettre donnée au départ</span>
				</div>
				<div class="rule-example">
					<div class="example-tile correct">O</div>
					<span>Lettre bien placée</span>
				</div>
				<div class="rule-example">
					<div class="example-tile misplaced">A</div>
					<span>Lettre présente mais mal placée</span>
				</div>
				<div class="rule-example">
					<div class="example-tile absent">X</div>
					<span>Lettre absente du mot</span>
				</div>
			</div>

			<p class="rules-note">Un nouveau mot vous attend chaque jour à minuit.</p>
		</div>
	</Modal>

	<Modal open={showStats} title="Partie du jour" onClose={() => (showStats = false)}>
		<div class="stats">
			{#if gameState.gameStatus !== 'playing'}
				<div class="stats-headline stats-headline-{gameState.gameStatus}">
					{#if gameState.gameStatus === 'won'}
						<span class="stats-icon">🎉</span>
						<div>
							<div class="stats-title">Bravo !</div>
							<div class="stats-subtitle">Trouvé en {gameState.guesses.length} essai{gameState.guesses.length > 1 ? 's' : ''}</div>
						</div>
					{:else}
						<span class="stats-icon">💡</span>
						<div>
							<div class="stats-title">Le mot était</div>
							<div class="stats-word">{gameState.solution}</div>
						</div>
					{/if}
				</div>
			{/if}

			<div class="stats-grid">
				<div class="stat">
					<span class="stat-value">{gameState.guesses.length}</span>
					<span class="stat-label">Essais</span>
				</div>
				<div class="stat">
					<span class="stat-value">{gameState.solution.length}</span>
					<span class="stat-label">Lettres</span>
				</div>
				<div class="stat">
					<span class="stat-value stat-result">
						{#if gameState.gameStatus === 'won'}
							<span class="result-pill result-win">Gagné</span>
						{:else if gameState.gameStatus === 'lost'}
							<span class="result-pill result-loss">Perdu</span>
						{:else}
							<span class="result-pill result-playing">En cours</span>
						{/if}
					</span>
					<span class="stat-label">Résultat</span>
				</div>
			</div>

			{#if emojiGrid.length > 0}
				<div class="emoji-grid" aria-label="Résumé de la partie">
					{#each emojiGrid as line}
						<div class="emoji-line">{line}</div>
					{/each}
				</div>
			{/if}

			<div class="countdown">
				<span class="countdown-label">Prochain mot dans</span>
				<span class="countdown-value">{countdown}</span>
			</div>

			{#if gameState.gameStatus !== 'playing'}
				<button class="share-btn" onclick={shareResult}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<circle cx="18" cy="5" r="3"/>
						<circle cx="6" cy="12" r="3"/>
						<circle cx="18" cy="19" r="3"/>
						<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
						<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
					</svg>
					Partager
				</button>
			{/if}
		</div>
	</Modal>
</div>

<style>
	.game-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		height: 100dvh;
		max-width: 600px;
		margin: 0 auto;
		overflow: hidden;
	}

	.game-main {
		display: flex;
		flex-direction: column;
		flex: 1;
		justify-content: space-between;
		overflow: hidden;
	}

	.board-container {
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.keyboard-container {
		padding: 8px 8px calc(16px + env(safe-area-inset-bottom, 0px));
		flex-shrink: 0;
	}

	/* Confetti overlay */
	.confetti {
		position: fixed;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
		z-index: 150;
	}

	.confetti-piece {
		position: absolute;
		top: -5vh;
		border-radius: 2px;
		animation: confetti-fall linear forwards;
		opacity: 0.95;
	}

	/* Rules modal */
	.rules {
		display: flex;
		flex-direction: column;
		gap: 14px;
		color: var(--color-text);
		font-size: 0.95rem;
		line-height: 1.6;
	}

	.rules p strong {
		color: var(--color-accent);
	}

	.rules-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin: 6px 0 4px;
		padding: 14px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--color-border);
		border-radius: 14px;
	}

	.rules-section h3 {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin-bottom: 2px;
	}

	.rule-example {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.example-tile {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 10px;
		font-weight: 800;
		font-size: 1.05rem;
		flex-shrink: 0;
	}

	.example-tile.initial {
		background: linear-gradient(145deg, var(--color-initial-hi), var(--color-initial));
		color: var(--color-initial-text);
		border-radius: 999px;
		box-shadow: 0 4px 12px rgba(232, 67, 147, 0.3);
	}

	.example-tile.correct {
		background: linear-gradient(145deg, var(--color-correct-hi), var(--color-correct));
		color: var(--color-correct-text);
		box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
	}

	.example-tile.misplaced {
		background: linear-gradient(145deg, var(--color-misplaced-hi), var(--color-misplaced));
		color: var(--color-misplaced-text);
		box-shadow: 0 4px 12px rgba(253, 203, 110, 0.3);
	}

	.example-tile.absent {
		background: var(--color-absent);
		color: var(--color-absent-text);
	}

	.rules-note {
		color: var(--color-text-muted);
		font-style: italic;
		font-size: 0.85rem;
	}

	/* Stats modal */
	.stats {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.stats-headline {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 16px;
		border-radius: 16px;
		border: 1px solid var(--color-border);
	}

	.stats-headline-won {
		background: linear-gradient(135deg, rgba(108, 92, 231, 0.18), rgba(162, 155, 254, 0.08));
		border-color: rgba(162, 155, 254, 0.3);
	}

	.stats-headline-lost {
		background: linear-gradient(135deg, rgba(232, 67, 147, 0.18), rgba(253, 203, 110, 0.08));
		border-color: rgba(232, 67, 147, 0.3);
	}

	.stats-icon {
		font-size: 2rem;
		line-height: 1;
	}

	.stats-title {
		font-weight: 800;
		font-size: 1.05rem;
		color: var(--color-text);
	}

	.stats-subtitle {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.stats-word {
		font-weight: 800;
		font-size: 1.3rem;
		letter-spacing: 0.12em;
		color: var(--color-accent);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 14px 6px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--color-border);
		border-radius: 14px;
	}

	.stat-value {
		font-size: 1.7rem;
		font-weight: 900;
		color: var(--color-accent);
		line-height: 1;
	}

	.stat-value.stat-result {
		font-size: 0.8rem;
	}

	.result-pill {
		display: inline-block;
		padding: 5px 10px;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.result-win {
		background: linear-gradient(135deg, #8778f5, #6c5ce7);
		color: #fff;
	}

	.result-loss {
		background: linear-gradient(135deg, #ff6ab0, #e84393);
		color: #fff;
	}

	.result-playing {
		background: var(--color-surface);
		color: var(--color-text-muted);
	}

	.stat-label {
		font-size: 0.68rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 600;
	}

	.emoji-grid {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 14px;
		background: rgba(0, 0, 0, 0.25);
		border-radius: 14px;
		font-size: 1.25rem;
		line-height: 1.1;
	}

	.emoji-line {
		letter-spacing: 0.02em;
	}

	.countdown {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 12px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--color-border);
		border-radius: 14px;
	}

	.countdown-label {
		font-size: 0.72rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 600;
	}

	.countdown-value {
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--color-text);
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.05em;
	}

	.share-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		width: 100%;
		padding: 14px;
		border-radius: 14px;
		background: linear-gradient(135deg, var(--color-correct), var(--color-initial));
		color: white;
		font-size: 1rem;
		font-weight: 800;
		letter-spacing: 0.02em;
		transition: transform 0.2s var(--ease-spring), box-shadow 0.2s ease;
		box-shadow: 0 10px 24px rgba(108, 92, 231, 0.35);
	}

	.share-btn:hover {
		transform: translateY(-1px) scale(1.01);
		box-shadow: 0 14px 28px rgba(108, 92, 231, 0.45);
	}

	.share-btn:active {
		transform: scale(0.97);
	}
</style>
