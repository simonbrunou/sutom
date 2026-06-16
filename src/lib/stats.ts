// Persistent play statistics: games played, win %, current/max streak and a
// guess distribution. Pure + side-effect-free except for the explicit
// load/save helpers, so the streak/idempotency logic is unit-testable.

export const STATS_KEY = 'sutom-stats';

export interface Stats {
	played: number;
	won: number;
	currentStreak: number;
	maxStreak: number;
	/** Day index (puzzle number) of the most recent recorded game, or null if none. */
	lastDayIndex: number | null;
	/** distribution[i] = number of wins in (i + 1) guesses; length === maxAttempts. */
	distribution: number[];
}

export interface GameResult {
	/** Puzzle number — see getDayIndex() in game.ts. Used to dedupe and to detect streaks. */
	dayIndex: number;
	won: boolean;
	/** Guesses used (1..maxAttempts). Ignored when !won. */
	attempts: number;
}

export function createStats(maxAttempts = 6): Stats {
	const distribution: number[] = [];
	for (let i = 0; i < maxAttempts; i++) distribution.push(0);
	return {
		played: 0,
		won: 0,
		currentStreak: 0,
		maxStreak: 0,
		lastDayIndex: null,
		distribution
	};
}

/**
 * Fold a finished game into the stats. Idempotent by dayIndex: re-recording the
 * latest day (e.g. on reload, or because the stats modal re-renders) is a no-op,
 * and past days are ignored. A streak only continues when the new game is the day
 * immediately after the last recorded one; a gap or a loss resets it.
 */
export function recordResult(stats: Stats, result: GameResult): Stats {
	if (stats.lastDayIndex !== null && result.dayIndex <= stats.lastDayIndex) {
		return stats;
	}

	const next: Stats = { ...stats, distribution: [...stats.distribution] };
	next.played += 1;

	if (result.won) {
		next.won += 1;
		const idx = result.attempts - 1;
		if (idx >= 0 && idx < next.distribution.length) next.distribution[idx] += 1;
		const consecutive = stats.lastDayIndex !== null && result.dayIndex === stats.lastDayIndex + 1;
		next.currentStreak = consecutive ? stats.currentStreak + 1 : 1;
		next.maxStreak = Math.max(stats.maxStreak, next.currentStreak);
	} else {
		next.currentStreak = 0;
	}

	next.lastDayIndex = result.dayIndex;
	return next;
}

export function winPercent(stats: Stats): number {
	return stats.played === 0 ? 0 : Math.round((stats.won / stats.played) * 100);
}

function isValidStats(value: unknown, maxAttempts: number): value is Stats {
	if (typeof value !== 'object' || value === null) return false;
	const s = value as Record<string, unknown>;
	return (
		typeof s.played === 'number' &&
		s.played >= 0 &&
		typeof s.won === 'number' &&
		s.won >= 0 &&
		s.won <= s.played &&
		typeof s.currentStreak === 'number' &&
		s.currentStreak >= 0 &&
		typeof s.maxStreak === 'number' &&
		s.maxStreak >= 0 &&
		(s.lastDayIndex === null || typeof s.lastDayIndex === 'number') &&
		Array.isArray(s.distribution) &&
		s.distribution.length === maxAttempts &&
		s.distribution.every((n) => typeof n === 'number' && n >= 0)
	);
}

export function loadStats(maxAttempts = 6): Stats {
	if (typeof localStorage === 'undefined') return createStats(maxAttempts);
	try {
		const raw = localStorage.getItem(STATS_KEY);
		if (!raw) return createStats(maxAttempts);
		const parsed: unknown = JSON.parse(raw);
		return isValidStats(parsed, maxAttempts) ? parsed : createStats(maxAttempts);
	} catch {
		return createStats(maxAttempts);
	}
}

export function saveStats(stats: Stats): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(STATS_KEY, JSON.stringify(stats));
	} catch {
		// ignore quota / private-mode errors
	}
}
