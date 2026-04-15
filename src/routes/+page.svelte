<script lang="ts">
	import { onMount } from 'svelte';
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
	import { WORDS, isValidWord } from '$lib/words';
	import Header from '$lib/components/Header.svelte';
	import Board from '$lib/components/Board.svelte';
	import Keyboard from '$lib/components/Keyboard.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Toast from '$lib/components/Toast.svelte';

	let gameState: GameState = $state(createInitialState(getDailyWord(WORDS)));
	let shakeRow = $state(-1);
	let bounceRow = $state(-1);
	let toastMessage = $state('');
	let toastVisible = $state(false);
	let showRules = $state(false);
	let showStats = $state(false);
	let toastTimeout: ReturnType<typeof setTimeout> | undefined;

	const grid = $derived(getGridData(gameState));
	const keyStates = $derived(getKeyboardState(gameState.guesses, gameState.solution));
	const currentRowIndex = $derived(gameState.guesses.length);

	function showToast(msg: string, duration = 2000) {
		if (toastTimeout) clearTimeout(toastTimeout);
		toastMessage = msg;
		toastVisible = true;
		toastTimeout = setTimeout(() => {
			toastVisible = false;
		}, duration);
	}

	function handleKey(key: string) {
		if (gameState.gameStatus !== 'playing') return;

		if (key === 'ENTER') {
			if (gameState.currentGuess.length < gameState.solution.length) {
				showToast('Pas assez de lettres');
				shakeRow = currentRowIndex;
				setTimeout(() => (shakeRow = -1), 600);
				return;
			}
			if (!isValidWord(gameState.currentGuess)) {
				showToast('Mot non reconnu');
				shakeRow = currentRowIndex;
				setTimeout(() => (shakeRow = -1), 600);
				return;
			}
			const prevStatus = gameState.gameStatus;
			gameState = submitGuess(gameState);

			if (gameState.gameStatus === 'won') {
				const messages = ['Génial !', 'Magnifique !', 'Superbe !', 'Bien joué !', 'De justesse !', 'Ouf !'];
				const idx = Math.min(gameState.guesses.length - 1, messages.length - 1);
				bounceRow = gameState.guesses.length - 1;
				setTimeout(() => {
					showToast(messages[idx], 3000);
					bounceRow = -1;
				}, gameState.solution.length * 150 + 500);
			} else if (gameState.gameStatus === 'lost') {
				setTimeout(() => {
					showToast(`Le mot était : ${gameState.solution}`, 5000);
				}, gameState.solution.length * 150 + 500);
			}
			return;
		}

		if (key === 'BACK') {
			gameState = removeLetter(gameState);
			return;
		}

		if (/^[A-Z]$/.test(key)) {
			gameState = addLetter(gameState, key);
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
		}
	}

	function handleNewGame() {
		gameState = createInitialState(getDailyWord(WORDS));
	}

	onMount(() => {
		// Load saved state from localStorage
		try {
			const saved = localStorage.getItem('sutom-state');
			if (saved) {
				const parsed = JSON.parse(saved);
				const todayWord = getDailyWord(WORDS);
				if (parsed.solution === todayWord) {
					gameState = parsed;
				}
			}
		} catch {
			// Ignore parse errors
		}
	});

	$effect(() => {
		// Save state to localStorage on changes
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
	/>

	<main class="game-main">
		<div class="board-container">
			<Board {grid} {currentRowIndex} {shakeRow} {bounceRow} />
		</div>

		<div class="keyboard-container">
			<Keyboard {keyStates} onKey={handleKey} />
		</div>
	</main>

	<Toast message={toastMessage} visible={toastVisible} />

	<Modal open={showRules} title="Comment jouer" onClose={() => (showRules = false)}>
		<div class="rules">
			<p>Trouvez le mot du jour en <strong>6 essais</strong>.</p>
			<p>La <strong>première lettre</strong> vous est donnée. Chaque essai doit être un mot valide.</p>

			<div class="rules-section">
				<h3>Indices</h3>
				<div class="rule-example">
					<div class="example-tile correct">S</div>
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

			<p class="rules-note">Un nouveau mot est disponible chaque jour !</p>
		</div>
	</Modal>

	<Modal open={showStats} title="Statistiques" onClose={() => (showStats = false)}>
		<div class="stats">
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
					<span class="stat-value">{gameState.gameStatus === 'won' ? '✓' : gameState.gameStatus === 'lost' ? '✗' : '...'}</span>
					<span class="stat-label">Résultat</span>
				</div>
			</div>
			{#if gameState.gameStatus !== 'playing'}
				<button class="share-btn" onclick={() => {
					const lines = gameState.guesses.map(g => {
						const tiles = evaluateGuess(g, gameState.solution);
						return tiles.map(t => {
							if (t.state === 'correct') return '🟪';
							if (t.state === 'misplaced') return '🟨';
							return '⬛';
						}).join('');
					});
					const text = `SUTOM ${gameState.guesses.length}/${gameState.maxAttempts}\n\n${lines.join('\n')}`;
					navigator.clipboard.writeText(text).then(() => showToast('Copié !'));
				}}>
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
		padding: 8px 8px 16px;
		flex-shrink: 0;
	}

	/* Rules modal styles */
	.rules {
		display: flex;
		flex-direction: column;
		gap: 16px;
		color: var(--color-text);
		font-size: 0.95rem;
		line-height: 1.6;
	}

	.rules-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin: 8px 0;
	}

	.rules-section h3 {
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-accent);
	}

	.rule-example {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.example-tile {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 8px;
		font-weight: 700;
		font-size: 1.1rem;
		flex-shrink: 0;
	}

	.example-tile.correct {
		background: var(--color-correct);
		color: var(--color-correct-text);
	}

	.example-tile.misplaced {
		background: var(--color-misplaced);
		color: var(--color-misplaced-text);
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

	/* Stats modal styles */
	.stats {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.stat-value {
		font-size: 1.8rem;
		font-weight: 800;
		color: var(--color-accent);
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.share-btn {
		width: 100%;
		padding: 14px;
		border-radius: 12px;
		background: linear-gradient(135deg, var(--color-correct), var(--color-initial));
		color: white;
		font-size: 1rem;
		font-weight: 700;
		transition: transform 0.2s ease;
	}

	.share-btn:hover {
		transform: scale(1.02);
	}

	.share-btn:active {
		transform: scale(0.98);
	}
</style>
