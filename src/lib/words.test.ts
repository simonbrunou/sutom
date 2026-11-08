import { describe, it, expect, vi } from 'vitest';
import { ANSWER_WORDS, createValidGuessesLoader, isValidWord, loadValidGuesses } from './words';

describe('ANSWER_WORDS', () => {
	it('contains words', () => {
		expect(ANSWER_WORDS.length).toBeGreaterThan(0);
	});

	it('loads thousands of dictionary words', () => {
		expect(ANSWER_WORDS.length).toBeGreaterThan(1000);
	});

	it('all words are uppercase', () => {
		for (const word of ANSWER_WORDS) {
			expect(word).toBe(word.toUpperCase());
		}
	});

	it('all words are between 5 and 8 letters', () => {
		for (const word of ANSWER_WORDS) {
			expect(word.length).toBeGreaterThanOrEqual(5);
			expect(word.length).toBeLessThanOrEqual(8);
		}
	});

	it('contains words of various lengths', () => {
		const lengths = new Set(ANSWER_WORDS.map((w) => w.length));
		expect(lengths.size).toBeGreaterThanOrEqual(3);
	});

	it('contains only alphabetic characters', () => {
		for (const word of ANSWER_WORDS) {
			expect(word).toMatch(/^[A-Z]+$/);
		}
	});

	it('is shuffled out of lexical order so daily picks are distributed', () => {
		// dictionary.txt is alphabetical; without a shuffle the first thousands
		// of entries would all start with 'A' and getDailyWord would serve only
		// A-words for years. Sample the early slice and require variety.
		const sample = ANSWER_WORDS.slice(0, 30);
		const firstLetters = new Set(sample.map((w) => w[0]));
		expect(firstLetters.size).toBeGreaterThanOrEqual(10);
	});
});

describe('loadValidGuesses', () => {
	it('is a Set', async () => {
		expect(await loadValidGuesses()).toBeInstanceOf(Set);
	});

	it('contains all answer words', async () => {
		const validGuesses = await loadValidGuesses();
		for (let i = 0; i < Math.min(ANSWER_WORDS.length, 100); i++) {
			expect(validGuesses.has(ANSWER_WORDS[i])).toBe(true);
		}
	});
});

describe('isValidWord', () => {
	it('returns true for words in the dictionary', async () => {
		const word = ANSWER_WORDS[0];
		expect(await isValidWord(word)).toBe(true);
	});

	it('is case insensitive', async () => {
		const word = ANSWER_WORDS[0];
		expect(await isValidWord(word.toLowerCase())).toBe(true);
	});

	it('returns false for words not in the dictionary', async () => {
		expect(await isValidWord('XYZXYZ')).toBe(false);
	});

	it('returns false for empty string', async () => {
		expect(await isValidWord('')).toBe(false);
	});
});

describe('createValidGuessesLoader', () => {
	it('parses the text with the answer-word filter', async () => {
		const load = createValidGuessesLoader(
			async () => 'maison\nabc\nCHAT-ON\n  Jardin \nANTICONSTITUTION\n'
		);
		expect([...(await load())]).toEqual(['MAISON', 'JARDIN']);
	});

	it('imports the text once and returns the same Set on later calls', async () => {
		const importText = vi.fn(async () => 'MAISON\n');
		const load = createValidGuessesLoader(importText);
		const first = await load();
		expect(await load()).toBe(first);
		expect(importText).toHaveBeenCalledTimes(1);
	});

	it('shares one import between calls made while it is pending', async () => {
		let resolveText: (text: string) => void = () => {};
		const importText = vi.fn(
			() =>
				new Promise<string>((resolve) => {
					resolveText = resolve;
				})
		);
		const load = createValidGuessesLoader(importText);
		const first = load();
		const second = load();
		resolveText('MAISON\n');
		expect(await first).toBe(await second);
		expect(importText).toHaveBeenCalledTimes(1);
	});

	it('imports the text again on the call after a failed import', async () => {
		const importText = vi
			.fn<() => Promise<string>>()
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValueOnce('MAISON\n');
		const load = createValidGuessesLoader(importText);
		await expect(load()).rejects.toThrow('offline');
		expect((await load()).has('MAISON')).toBe(true);
		expect(importText).toHaveBeenCalledTimes(2);
	});
});
