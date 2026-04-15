export type LetterState = 'correct' | 'misplaced' | 'absent' | 'empty' | 'tbd';

export interface TileData {
	letter: string;
	state: LetterState;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
	solution: string;
	guesses: string[];
	currentGuess: string;
	gameStatus: GameStatus;
	maxAttempts: number;
}

export function createInitialState(solution: string, maxAttempts = 6): GameState {
	return {
		solution: solution.toUpperCase(),
		guesses: [],
		currentGuess: solution[0].toUpperCase(),
		gameStatus: 'playing',
		maxAttempts
	};
}

export function evaluateGuess(guess: string, solution: string): TileData[] {
	const guessArr = guess.toUpperCase().split('');
	const solutionArr = solution.toUpperCase().split('');
	const result: TileData[] = guessArr.map((letter) => ({ letter, state: 'absent' as LetterState }));

	const solutionLetterCounts: Record<string, number> = {};
	for (const letter of solutionArr) {
		solutionLetterCounts[letter] = (solutionLetterCounts[letter] || 0) + 1;
	}

	// First pass: mark correct positions
	for (let i = 0; i < guessArr.length; i++) {
		if (guessArr[i] === solutionArr[i]) {
			result[i].state = 'correct';
			solutionLetterCounts[guessArr[i]]--;
		}
	}

	// Second pass: mark misplaced letters
	for (let i = 0; i < guessArr.length; i++) {
		if (result[i].state === 'correct') continue;
		if (solutionLetterCounts[guessArr[i]] > 0) {
			result[i].state = 'misplaced';
			solutionLetterCounts[guessArr[i]]--;
		}
	}

	return result;
}

export function addLetter(state: GameState, letter: string): GameState {
	if (state.gameStatus !== 'playing') return state;
	if (state.currentGuess.length >= state.solution.length) return state;

	return {
		...state,
		currentGuess: state.currentGuess + letter.toUpperCase()
	};
}

export function removeLetter(state: GameState): GameState {
	if (state.gameStatus !== 'playing') return state;
	// Cannot remove the first letter (it's given)
	if (state.currentGuess.length <= 1) return state;

	return {
		...state,
		currentGuess: state.currentGuess.slice(0, -1)
	};
}

export function submitGuess(state: GameState): GameState {
	if (state.gameStatus !== 'playing') return state;
	if (state.currentGuess.length !== state.solution.length) return state;

	const newGuesses = [...state.guesses, state.currentGuess];
	const isCorrect = state.currentGuess.toUpperCase() === state.solution.toUpperCase();
	const isLastAttempt = newGuesses.length >= state.maxAttempts;

	let gameStatus: GameStatus = 'playing';
	if (isCorrect) {
		gameStatus = 'won';
	} else if (isLastAttempt) {
		gameStatus = 'lost';
	}

	return {
		...state,
		guesses: newGuesses,
		currentGuess: gameStatus === 'playing' ? state.solution[0].toUpperCase() : '',
		gameStatus
	};
}

export function getKeyboardState(guesses: string[], solution: string): Record<string, LetterState> {
	const keyStates: Record<string, LetterState> = {};

	for (const guess of guesses) {
		const evaluation = evaluateGuess(guess, solution);
		for (const tile of evaluation) {
			const current = keyStates[tile.letter];
			if (tile.state === 'correct') {
				keyStates[tile.letter] = 'correct';
			} else if (tile.state === 'misplaced' && current !== 'correct') {
				keyStates[tile.letter] = 'misplaced';
			} else if (tile.state === 'absent' && !current) {
				keyStates[tile.letter] = 'absent';
			}
		}
	}

	return keyStates;
}

export function getGridData(state: GameState): TileData[][] {
	const rows: TileData[][] = [];

	// Submitted guesses
	for (const guess of state.guesses) {
		rows.push(evaluateGuess(guess, state.solution));
	}

	// Current guess row (if still playing)
	if (state.gameStatus === 'playing') {
		const currentRow: TileData[] = [];
		for (let i = 0; i < state.solution.length; i++) {
			if (i < state.currentGuess.length) {
				currentRow.push({ letter: state.currentGuess[i], state: 'tbd' });
			} else {
				currentRow.push({ letter: '', state: 'empty' });
			}
		}
		rows.push(currentRow);
	}

	// Empty rows for remaining attempts
	const remainingRows = state.maxAttempts - rows.length;
	for (let i = 0; i < remainingRows; i++) {
		const emptyRow: TileData[] = [];
		for (let j = 0; j < state.solution.length; j++) {
			emptyRow.push({ letter: '', state: 'empty' });
		}
		rows.push(emptyRow);
	}

	return rows;
}

export function getDailyWord(words: string[]): string {
	const epoch = new Date(2024, 0, 1).getTime();
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
	const dayIndex = Math.floor((today - epoch) / 86400000);
	return words[dayIndex % words.length].toUpperCase();
}

export function isValidLength(guess: string, solution: string): boolean {
	return guess.length === solution.length;
}
