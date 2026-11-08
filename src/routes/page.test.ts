import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { getDailyWord } from '#lib/game.js';
import { ANSWER_WORDS, createValidGuessesLoader } from '#lib/words.js';
import Page from './+page.svelte';

// The page reads the valid-guesses list through loadValidGuesses. Each test
// swaps in a loader built by the real createValidGuessesLoader over an import
// the test settles by hand, so a load can stay pending or fail.
const words = vi.hoisted(() => ({
	loadValidGuesses: (): Promise<Set<string>> => Promise.reject(new Error('no loader set'))
}));

vi.mock('#lib/words.js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('#lib/words.js')>();
	return { ...actual, loadValidGuesses: () => words.loadValidGuesses() };
});

type Deferred = {
	promise: Promise<string>;
	resolve: (text: string) => void;
	reject: (error: unknown) => void;
};

function deferred(): Deferred {
	let resolve: Deferred['resolve'] = () => {};
	let reject: Deferred['reject'] = () => {};
	const promise = new Promise<string>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

let imports: Deferred[];
let importText: Mock<() => Promise<string>>;

const solution = getDailyWord(ANSWER_WORDS);
// A full row that is not the solution, so a submitted guess leaves the game playing.
const guess = solution[0] + 'Z'.repeat(solution.length - 1);

function savedGame(): { guesses: string[]; currentGuess: string } {
	return JSON.parse(localStorage.getItem('sutom-state') ?? '{}');
}

async function typeRow(word: string) {
	for (const letter of word.slice(1)) {
		await fireEvent.keyDown(window, { key: letter });
	}
}

async function pressEnter() {
	await fireEvent.keyDown(window, { key: 'Enter' });
}

beforeEach(() => {
	localStorage.clear();
	imports = [];
	importText = vi.fn(() => {
		const next = deferred();
		imports.push(next);
		return next.promise;
	});
	words.loadValidGuesses = createValidGuessesLoader(importText);
});

describe('home page guess check', () => {
	it('starts loading the valid-guesses list on mount, before any key', async () => {
		render(Page);
		await waitFor(() => expect(importText).toHaveBeenCalledTimes(1));
	});

	it('submits a valid word once the pending list load resolves', async () => {
		render(Page);
		await typeRow(guess);
		await pressEnter();
		// Keys are ignored while the guess waits: this Backspace must not edit the row.
		await fireEvent.keyDown(window, { key: 'Backspace' });
		expect(savedGame().guesses).toEqual([]);

		imports[0].resolve(`${guess}\n`);
		await waitFor(() => expect(savedGame().guesses).toEqual([guess]));
		expect(importText).toHaveBeenCalledTimes(1);
	});

	it('accepts a restored row whatever its case, as isValidWord does', async () => {
		localStorage.setItem(
			'sutom-state',
			JSON.stringify({
				solution,
				guesses: [],
				currentGuess: guess.toLowerCase(),
				gameStatus: 'playing',
				maxAttempts: 6
			})
		);
		render(Page);
		await pressEnter();

		imports[0].resolve(`${guess}\n`);
		await waitFor(() => expect(savedGame().guesses).toHaveLength(1));
	});

	it('rejects an unknown word with "Mot non reconnu" once the pending load resolves', async () => {
		render(Page);
		await typeRow(guess);
		await pressEnter();

		imports[0].resolve(`${solution}\n`);
		await waitFor(() => expect(screen.getByTestId('toast')).toHaveTextContent('Mot non reconnu'));
		expect(savedGame().guesses).toEqual([]);
		expect(savedGame().currentGuess).toBe(guess);
	});

	it('shows an error when the list fails to load, then loads it again on the next Enter', async () => {
		render(Page);
		await typeRow(guess);
		await pressEnter();

		imports[0].reject(new Error('offline'));
		await waitFor(() =>
			expect(screen.getByTestId('toast')).toHaveTextContent(
				'Dictionnaire indisponible, rechargez la page'
			)
		);
		expect(savedGame().guesses).toEqual([]);
		expect(savedGame().currentGuess).toBe(guess);

		await pressEnter();
		expect(importText).toHaveBeenCalledTimes(2);
		imports[1].resolve(`${guess}\n`);
		await waitFor(() => expect(savedGame().guesses).toEqual([guess]));
	});

	describe('midnight rollover while the guess waits', () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		it("drops yesterday's guess instead of checking it against the new game", async () => {
			// Fake only Date: the page's real 1 s countdown interval then sees the new day.
			vi.useFakeTimers({ toFake: ['Date'] });
			const evening = new Date(2026, 10, 8, 23, 59, 50);
			vi.setSystemTime(evening);
			const todayWord = getDailyWord(ANSWER_WORDS, evening);
			const todayGuess = todayWord[0] + 'Z'.repeat(todayWord.length - 1);

			render(Page);
			await typeRow(todayGuess);
			await pressEnter();

			const nextDay = new Date(2026, 10, 9, 0, 0, 5);
			vi.setSystemTime(nextDay);
			// The next countdown tick lands up to 1 s from now, later on a loaded CI
			// runner, so wait longer than waitFor's 1 s default.
			await waitFor(
				() =>
					expect(JSON.parse(localStorage.getItem('sutom-state') ?? '{}').solution).toBe(
						getDailyWord(ANSWER_WORDS, nextDay)
					),
				{ timeout: 5000 }
			);

			// The list lacks the guess: checking it would toast "Mot non reconnu" on the new game.
			imports[0].resolve(`${todayWord}\n`);
			await imports[0].promise;
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(screen.getByTestId('toast')).not.toHaveTextContent('Mot non reconnu');
			expect(savedGame().guesses).toEqual([]);
		});
	});
});
