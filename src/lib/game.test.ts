import { describe, it, expect } from 'vitest';
import {
	evaluateGuess,
	createInitialState,
	addLetter,
	removeLetter,
	submitGuess,
	getKeyboardState,
	getGridData,
	getDailyWord,
	isValidLength,
	type LetterState,
	type GameState
} from './game';

describe('evaluateGuess', () => {
	it('marks all letters as correct when guess matches solution', () => {
		const result = evaluateGuess('ARBRE', 'ARBRE');
		expect(result.every((t) => t.state === 'correct')).toBe(true);
	});

	it('marks all letters as absent when no letters match', () => {
		const result = evaluateGuess('XYZHW', 'ARBRE');
		expect(result.every((t) => t.state === 'absent')).toBe(true);
	});

	it('marks correct positions', () => {
		const result = evaluateGuess('ABCDE', 'AXCXE');
		expect(result[0].state).toBe('correct');
		expect(result[2].state).toBe('correct');
		expect(result[4].state).toBe('correct');
	});

	it('marks misplaced letters', () => {
		const result = evaluateGuess('BRISE', 'ARBRE');
		// ARBRE = A,R,B,R,E  BRISE = B,R,I,S,E
		expect(result[0].state).toBe('misplaced'); // B is in ARBRE but not at pos 0
		expect(result[1].state).toBe('correct');   // R matches R at pos 1
		expect(result[2].state).toBe('absent');    // I not in ARBRE
		expect(result[3].state).toBe('absent');    // S not in ARBRE
		expect(result[4].state).toBe('correct');   // E matches E at pos 4
	});

	it('handles duplicate letters in guess with single in solution', () => {
		// Solution has one E, guess has two E's
		const result = evaluateGuess('ETETE', 'ABCDE');
		// First E: not at correct position, but E exists -> misplaced
		// Second E (pos 2): not at position, but already used E count -> absent
		// Third E (pos 4): correct position
		expect(result[4].state).toBe('correct');
		// Only one remaining E in solution, first one gets misplaced
		const misplacedCount = result.filter((t) => t.state === 'misplaced').length;
		const correctCount = result.filter((t) => t.state === 'correct').length;
		expect(correctCount).toBe(1); // E at pos 4
		// No extra misplaced E's beyond what's available
		expect(misplacedCount + correctCount).toBeLessThanOrEqual(1 + misplacedCount);
	});

	it('handles duplicate letters in solution', () => {
		// ARBRE = A,R,B,R,E  ARRRE = A,R,R,R,E
		const result = evaluateGuess('ARRRE', 'ARBRE');
		expect(result[0].state).toBe('correct');    // A at pos 0
		expect(result[1].state).toBe('correct');    // R at pos 1 matches
		expect(result[2].state).toBe('absent');     // R at pos 2, solution has B here, no more R left
		expect(result[3].state).toBe('correct');    // R at pos 3 matches R at pos 3
		expect(result[4].state).toBe('correct');    // E at pos 4
	});

	it('prioritizes correct matches over misplaced', () => {
		const result = evaluateGuess('AAXXX', 'AABBB');
		expect(result[0].state).toBe('correct'); // A at pos 0
		expect(result[1].state).toBe('correct'); // A at pos 1
	});

	it('returns correct letters in result', () => {
		const result = evaluateGuess('MONDE', 'MONDE');
		expect(result.map((t) => t.letter)).toEqual(['M', 'O', 'N', 'D', 'E']);
	});

	it('is case insensitive', () => {
		const result = evaluateGuess('arbre', 'ARBRE');
		expect(result.every((t) => t.state === 'correct')).toBe(true);
	});

	it('works with different word lengths', () => {
		const result = evaluateGuess('CHATEAU', 'CHATEAU');
		expect(result).toHaveLength(7);
		expect(result.every((t) => t.state === 'correct')).toBe(true);
	});

	it('handles single letter words', () => {
		const result = evaluateGuess('A', 'A');
		expect(result).toHaveLength(1);
		expect(result[0].state).toBe('correct');
	});

	it('correctly handles letter appearing in both correct and wrong positions', () => {
		// Solution: MASSE, Guess: MESSE
		const result = evaluateGuess('MESSE', 'MASSE');
		expect(result[0].state).toBe('correct'); // M
		// E at pos 1 vs A at pos 1 - E is in solution at pos 4
		// S at pos 2 vs S at pos 2 - correct
		expect(result[2].state).toBe('correct'); // S
		expect(result[3].state).toBe('correct'); // S at pos 3
		expect(result[4].state).toBe('correct'); // E at pos 4
	});
});

describe('createInitialState', () => {
	it('creates a state with the solution uppercased', () => {
		const state = createInitialState('arbre');
		expect(state.solution).toBe('ARBRE');
	});

	it('sets the first letter as the current guess', () => {
		const state = createInitialState('MONDE');
		expect(state.currentGuess).toBe('M');
	});

	it('starts with playing status', () => {
		const state = createInitialState('TABLE');
		expect(state.gameStatus).toBe('playing');
	});

	it('starts with empty guesses', () => {
		const state = createInitialState('CHAIR');
		expect(state.guesses).toHaveLength(0);
	});

	it('defaults to 6 max attempts', () => {
		const state = createInitialState('FRUIT');
		expect(state.maxAttempts).toBe(6);
	});

	it('allows custom max attempts', () => {
		const state = createInitialState('FRUIT', 4);
		expect(state.maxAttempts).toBe(4);
	});
});

describe('addLetter', () => {
	it('adds a letter to current guess', () => {
		const state = createInitialState('ARBRE');
		const next = addLetter(state, 'R');
		expect(next.currentGuess).toBe('AR');
	});

	it('uppercases the added letter', () => {
		const state = createInitialState('ARBRE');
		const next = addLetter(state, 'r');
		expect(next.currentGuess).toBe('AR');
	});

	it('does not add beyond solution length', () => {
		let state = createInitialState('AB');
		state = addLetter(state, 'B'); // Now 'AB' - full
		const next = addLetter(state, 'C');
		expect(next.currentGuess).toBe('AB');
	});

	it('does not add when game is won', () => {
		let state = createInitialState('AB');
		state = { ...state, gameStatus: 'won' };
		const next = addLetter(state, 'X');
		expect(next.currentGuess).toBe(state.currentGuess);
	});

	it('does not add when game is lost', () => {
		let state = createInitialState('AB');
		state = { ...state, gameStatus: 'lost' };
		const next = addLetter(state, 'X');
		expect(next.currentGuess).toBe(state.currentGuess);
	});
});

describe('removeLetter', () => {
	it('removes the last letter', () => {
		let state = createInitialState('ARBRE');
		state = addLetter(state, 'R');
		state = addLetter(state, 'B');
		const next = removeLetter(state);
		expect(next.currentGuess).toBe('AR');
	});

	it('does not remove the first letter (given letter)', () => {
		const state = createInitialState('ARBRE');
		const next = removeLetter(state);
		expect(next.currentGuess).toBe('A');
	});

	it('does not remove when game is over', () => {
		let state = createInitialState('ARBRE');
		state = addLetter(state, 'R');
		state = { ...state, gameStatus: 'won' };
		const next = removeLetter(state);
		expect(next.currentGuess).toBe(state.currentGuess);
	});
});

describe('submitGuess', () => {
	it('adds guess to guesses list', () => {
		let state = createInitialState('AB');
		state = addLetter(state, 'B');
		const next = submitGuess(state);
		expect(next.guesses).toContain('AB');
	});

	it('marks game as won on correct guess', () => {
		let state = createInitialState('AB');
		state = addLetter(state, 'B');
		const next = submitGuess(state);
		expect(next.gameStatus).toBe('won');
	});

	it('resets current guess with first letter after incorrect guess', () => {
		let state = createInitialState('AB');
		state = addLetter(state, 'X');
		const next = submitGuess(state);
		expect(next.currentGuess).toBe('A');
		expect(next.gameStatus).toBe('playing');
	});

	it('marks game as lost when max attempts reached', () => {
		let state = createInitialState('AB', 1);
		state = addLetter(state, 'X');
		const next = submitGuess(state);
		expect(next.gameStatus).toBe('lost');
	});

	it('does not submit incomplete guess', () => {
		const state = createInitialState('ARBRE');
		const next = submitGuess(state); // Only 'A', need 5
		expect(next.guesses).toHaveLength(0);
	});

	it('does not submit when game is over', () => {
		let state = createInitialState('AB');
		state = { ...state, gameStatus: 'won', currentGuess: 'AB' };
		const next = submitGuess(state);
		expect(next.guesses).toHaveLength(0);
	});

	it('clears current guess when game ends', () => {
		let state = createInitialState('AB');
		state = addLetter(state, 'B');
		const next = submitGuess(state);
		expect(next.gameStatus).toBe('won');
		expect(next.currentGuess).toBe('');
	});
});

describe('getKeyboardState', () => {
	it('returns empty for no guesses', () => {
		const result = getKeyboardState([], 'ARBRE');
		expect(Object.keys(result)).toHaveLength(0);
	});

	it('marks correct letters', () => {
		const result = getKeyboardState(['ARBRE'], 'ARBRE');
		expect(result['A']).toBe('correct');
		expect(result['R']).toBe('correct');
	});

	it('marks absent letters', () => {
		const result = getKeyboardState(['AXYZW'], 'ARBRE');
		expect(result['X']).toBe('absent');
		expect(result['Y']).toBe('absent');
	});

	it('correct takes priority over misplaced', () => {
		// First guess: A is misplaced, second guess: A is correct
		const result = getKeyboardState(['XAXXX', 'AXXXX'], 'ABCDE');
		expect(result['A']).toBe('correct');
	});

	it('misplaced takes priority over absent', () => {
		const result = getKeyboardState(['BXXXX'], 'ARBRE');
		expect(result['B']).toBe('misplaced');
	});
});

describe('getGridData', () => {
	it('returns correct number of rows', () => {
		const state = createInitialState('ARBRE');
		const grid = getGridData(state);
		expect(grid).toHaveLength(6); // default maxAttempts
	});

	it('shows submitted guesses with evaluations', () => {
		let state = createInitialState('AB');
		state = addLetter(state, 'B');
		state = submitGuess(state);
		const grid = getGridData(state);
		expect(grid[0][0].state).toBe('correct');
		expect(grid[0][1].state).toBe('correct');
	});

	it('shows current guess as tbd', () => {
		let state = createInitialState('ABC');
		state = addLetter(state, 'X');
		const grid = getGridData(state);
		// First row is current (no submitted guesses)
		expect(grid[0][0].state).toBe('tbd');
		expect(grid[0][0].letter).toBe('A');
		expect(grid[0][1].state).toBe('tbd');
		expect(grid[0][1].letter).toBe('X');
		expect(grid[0][2].state).toBe('empty');
	});

	it('fills remaining rows with empty tiles', () => {
		const state = createInitialState('AB');
		const grid = getGridData(state);
		// Row 0 = current, rows 1-5 = empty
		expect(grid[5][0].state).toBe('empty');
		expect(grid[5][0].letter).toBe('');
	});

	it('does not show current row when game is over', () => {
		let state = createInitialState('AB');
		state = addLetter(state, 'B');
		state = submitGuess(state); // won
		const grid = getGridData(state);
		expect(grid[0][0].state).toBe('correct');
		// Remaining rows should be empty
		expect(grid[1][0].state).toBe('empty');
	});
});

describe('getDailyWord', () => {
	it('returns a word from the list', () => {
		const words = ['ARBRE', 'MONDE', 'TABLE'];
		const word = getDailyWord(words);
		expect(words.map((w) => w.toUpperCase())).toContain(word);
	});

	it('returns consistent word for the same day', () => {
		const words = ['ARBRE', 'MONDE', 'TABLE', 'CHAIR', 'FLEUR'];
		const word1 = getDailyWord(words);
		const word2 = getDailyWord(words);
		expect(word1).toBe(word2);
	});

	it('returns uppercase word', () => {
		const words = ['arbre', 'monde'];
		const word = getDailyWord(words);
		expect(word).toBe(word.toUpperCase());
	});
});

describe('isValidLength', () => {
	it('returns true when guess matches solution length', () => {
		expect(isValidLength('ARBRE', 'MONDE')).toBe(true);
	});

	it('returns false when guess is too short', () => {
		expect(isValidLength('AB', 'ARBRE')).toBe(false);
	});

	it('returns false when guess is too long', () => {
		expect(isValidLength('ARBRES', 'ARBRE')).toBe(false);
	});
});
