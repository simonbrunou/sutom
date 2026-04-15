import { describe, it, expect } from 'vitest';
import { WORDS, VALID_GUESSES, isValidWord, getWordsByLength } from './words';

describe('WORDS', () => {
	it('contains words', () => {
		expect(WORDS.length).toBeGreaterThan(0);
	});

	it('all words are uppercase', () => {
		for (const word of WORDS) {
			expect(word).toBe(word.toUpperCase());
		}
	});

	it('all words are at least 5 letters', () => {
		for (const word of WORDS) {
			expect(word.length).toBeGreaterThanOrEqual(5);
		}
	});

	it('contains words of various lengths', () => {
		const lengths = new Set(WORDS.map((w) => w.length));
		expect(lengths.size).toBeGreaterThanOrEqual(3);
	});

	it('contains no duplicates', () => {
		const unique = new Set(WORDS);
		expect(unique.size).toBe(WORDS.length);
	});

	it('contains only alphabetic characters', () => {
		for (const word of WORDS) {
			expect(word).toMatch(/^[A-Z]+$/);
		}
	});
});

describe('VALID_GUESSES', () => {
	it('is a Set', () => {
		expect(VALID_GUESSES).toBeInstanceOf(Set);
	});

	it('contains all words from WORDS', () => {
		for (const word of WORDS) {
			expect(VALID_GUESSES.has(word.toUpperCase())).toBe(true);
		}
	});
});

describe('isValidWord', () => {
	it('returns true for words in the list', () => {
		const word = WORDS[0];
		expect(isValidWord(word)).toBe(true);
	});

	it('is case insensitive', () => {
		const word = WORDS[0];
		expect(isValidWord(word.toLowerCase())).toBe(true);
	});

	it('returns false for words not in the list', () => {
		expect(isValidWord('XYZXYZ')).toBe(false);
	});

	it('returns false for empty string', () => {
		expect(isValidWord('')).toBe(false);
	});
});

describe('getWordsByLength', () => {
	it('returns words of the specified length', () => {
		const fiveLetterWords = getWordsByLength(5);
		for (const word of fiveLetterWords) {
			expect(word.length).toBe(5);
		}
	});

	it('returns empty array for length with no words', () => {
		const result = getWordsByLength(1);
		expect(result).toHaveLength(0);
	});

	it('returns subset of WORDS', () => {
		const fiveLetterWords = getWordsByLength(5);
		for (const word of fiveLetterWords) {
			expect(WORDS).toContain(word);
		}
	});

	it('returns non-empty for valid lengths', () => {
		expect(getWordsByLength(5).length).toBeGreaterThan(0);
		expect(getWordsByLength(6).length).toBeGreaterThan(0);
		expect(getWordsByLength(7).length).toBeGreaterThan(0);
	});
});
