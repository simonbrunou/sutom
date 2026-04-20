import { describe, it, expect } from 'vitest';
import { ANSWER_WORDS, VALID_GUESSES, isValidWord } from './words';

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

describe('VALID_GUESSES', () => {
	it('is a Set', () => {
		expect(VALID_GUESSES).toBeInstanceOf(Set);
	});

	it('contains all answer words', () => {
		for (let i = 0; i < Math.min(ANSWER_WORDS.length, 100); i++) {
			expect(VALID_GUESSES.has(ANSWER_WORDS[i])).toBe(true);
		}
	});
});

describe('isValidWord', () => {
	it('returns true for words in the dictionary', () => {
		const word = ANSWER_WORDS[0];
		expect(isValidWord(word)).toBe(true);
	});

	it('is case insensitive', () => {
		const word = ANSWER_WORDS[0];
		expect(isValidWord(word.toLowerCase())).toBe(true);
	});

	it('returns false for words not in the dictionary', () => {
		expect(isValidWord('XYZXYZ')).toBe(false);
	});

	it('returns false for empty string', () => {
		expect(isValidWord('')).toBe(false);
	});
});
