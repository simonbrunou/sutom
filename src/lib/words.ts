// Answer pool: curated common French words (infinitives only for verbs).
// Valid guesses: the full French dictionary so players can use any real word.
// Each day's solution is picked at random from ANSWER_WORDS via getDailyWord().
import dictionaryText from './dictionary.txt?raw';
import validGuessesText from './valid-guesses.txt?raw';

// dictionary.txt is sorted alphabetically, so the first ~6k entries are A*.
// Indexing into that lexical order with getDailyWord would give players A-words
// for ~17 years straight, so shuffle once up front with a fixed seed. The seed
// is fixed so the shuffled order is reproducible across clients and deploys.
function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function deterministicShuffle<T>(arr: readonly T[], seed: number): T[] {
	const out = [...arr];
	const rand = mulberry32(seed);
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

function parseWordList(text: string): string[] {
	return text
		.split('\n')
		.map((w) => w.trim().toUpperCase())
		.filter((w) => w.length >= 5 && w.length <= 8 && /^[A-Z]+$/.test(w));
}

export const ANSWER_WORDS: string[] = deterministicShuffle(
	parseWordList(dictionaryText),
	0x5_07_07_05
);

// Returns a loader that fetches the valid-guesses text once, through
// importText, and parses it into a Set. Calls made while the load is pending
// share it, and later calls get the same Set. A failed load is not kept, so the
// next call runs importText again.
export function createValidGuessesLoader(
	importText: () => Promise<string>
): () => Promise<Set<string>> {
	let pending: Promise<Set<string>> | undefined;
	return () => {
		pending ??= importText().then(
			(text) => new Set(parseWordList(text)),
			(error: unknown) => {
				pending = undefined;
				throw error;
			}
		);
		return pending;
	};
}

// valid-guesses.txt is 697 kB, so it loads through a dynamic import() into a
// chunk of its own instead of the home page chunk (#195). The page starts the
// load after its first render, and only a submitted guess waits for it.
export const loadValidGuesses = createValidGuessesLoader(() => Promise.resolve(validGuessesText));

export async function isValidWord(word: string): Promise<boolean> {
	return (await loadValidGuesses()).has(word.toUpperCase());
}
