// Answer pool and valid-guess set: both derived from the bundled French dictionary.
// Each day's solution is picked at random from ANSWER_WORDS via getDailyWord().
import dictionaryText from './dictionary.txt?raw';

export const ANSWER_WORDS: string[] = dictionaryText
	.split('\n')
	.map((w) => w.trim().toUpperCase())
	.filter((w) => w.length >= 5 && w.length <= 8 && /^[A-Z]+$/.test(w));

export const VALID_GUESSES: Set<string> = new Set(ANSWER_WORDS);

export function isValidWord(word: string): boolean {
	return VALID_GUESSES.has(word.toUpperCase());
}
