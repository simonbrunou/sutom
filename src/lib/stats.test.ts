import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	createStats,
	recordResult,
	winPercent,
	loadStats,
	saveStats,
	STATS_KEY,
	type Stats
} from './stats';

const win = (dayIndex: number, attempts: number) => ({ dayIndex, won: true, attempts });
const loss = (dayIndex: number) => ({ dayIndex, won: false, attempts: 6 });

describe('createStats', () => {
	it('starts empty with a zeroed distribution of maxAttempts length', () => {
		const s = createStats(6);
		expect(s).toEqual({
			played: 0,
			won: 0,
			currentStreak: 0,
			maxStreak: 0,
			lastDayIndex: null,
			distribution: [0, 0, 0, 0, 0, 0]
		});
	});
});

describe('recordResult', () => {
	it('records a first win: played/won/streak and the right distribution bucket', () => {
		const s = recordResult(createStats(), win(100, 3));
		expect(s.played).toBe(1);
		expect(s.won).toBe(1);
		expect(s.currentStreak).toBe(1);
		expect(s.maxStreak).toBe(1);
		expect(s.lastDayIndex).toBe(100);
		expect(s.distribution).toEqual([0, 0, 1, 0, 0, 0]);
	});

	it('records a loss: counts the game but resets the streak and touches no bucket', () => {
		const s = recordResult(createStats(), loss(100));
		expect(s.played).toBe(1);
		expect(s.won).toBe(0);
		expect(s.currentStreak).toBe(0);
		expect(s.distribution).toEqual([0, 0, 0, 0, 0, 0]);
	});

	it('grows the streak on consecutive-day wins', () => {
		let s = createStats();
		s = recordResult(s, win(100, 2));
		s = recordResult(s, win(101, 4));
		s = recordResult(s, win(102, 1));
		expect(s.currentStreak).toBe(3);
		expect(s.maxStreak).toBe(3);
		expect(s.distribution).toEqual([1, 1, 0, 1, 0, 0]);
	});

	it('resets the streak to 1 when a day is skipped', () => {
		let s = createStats();
		s = recordResult(s, win(100, 2));
		s = recordResult(s, win(102, 2)); // skipped day 101
		expect(s.currentStreak).toBe(1);
		expect(s.maxStreak).toBe(1);
	});

	it('resets the streak to 0 on a loss, then 1 on the next consecutive win', () => {
		let s = createStats();
		s = recordResult(s, win(100, 2));
		s = recordResult(s, win(101, 2)); // streak 2
		s = recordResult(s, loss(102)); // streak 0
		expect(s.currentStreak).toBe(0);
		s = recordResult(s, win(103, 2)); // consecutive → streak 1
		expect(s.currentStreak).toBe(1);
		expect(s.maxStreak).toBe(2); // peak preserved
	});

	it('is idempotent: re-recording the latest day is a no-op', () => {
		const s = recordResult(createStats(), win(100, 3));
		const again = recordResult(s, win(100, 1)); // same day, different attempts
		expect(again).toEqual(s);
		expect(again.played).toBe(1);
	});

	it('ignores a past day index (defensive — daily word only advances)', () => {
		const s = recordResult(createStats(), win(100, 3));
		const past = recordResult(s, win(99, 1));
		expect(past).toEqual(s);
	});

	it('does not mutate the input stats object', () => {
		const s = createStats();
		const before = structuredClone(s);
		recordResult(s, win(100, 3));
		expect(s).toEqual(before);
	});
});

describe('winPercent', () => {
	it('is 0 with no games (no divide-by-zero)', () => {
		expect(winPercent(createStats())).toBe(0);
	});

	it('rounds to the nearest integer', () => {
		let s = createStats();
		s = recordResult(s, win(1, 2));
		s = recordResult(s, loss(2));
		s = recordResult(s, loss(3));
		expect(winPercent(s)).toBe(33); // 1/3
	});
});

describe('loadStats / saveStats', () => {
	let store: Record<string, string>;

	beforeEach(() => {
		store = {};
		vi.stubGlobal('localStorage', {
			getItem: (k: string) => (k in store ? store[k] : null),
			setItem: (k: string, v: string) => {
				store[k] = v;
			},
			removeItem: (k: string) => {
				delete store[k];
			}
		});
	});

	afterEach(() => vi.unstubAllGlobals());

	it('returns fresh stats when nothing is stored', () => {
		expect(loadStats()).toEqual(createStats());
	});

	it('round-trips a saved Stats object', () => {
		const s = recordResult(createStats(), win(100, 3));
		saveStats(s);
		expect(loadStats()).toEqual(s);
	});

	it('rejects corrupt JSON and returns fresh stats', () => {
		store[STATS_KEY] = '{ not valid json';
		expect(loadStats()).toEqual(createStats());
	});

	it.each([
		['wrong distribution length', { ...createStats(), distribution: [0, 0, 0] }],
		['won greater than played', { ...createStats(), played: 1, won: 5 }],
		['negative counter', { ...createStats(), played: -1 }],
		['missing field', { played: 1, won: 1 }]
	])('rejects invalid shape (%s) and returns fresh stats', (_label: string, bad: unknown) => {
		store[STATS_KEY] = JSON.stringify(bad);
		expect(loadStats()).toEqual(createStats());
	});

	it('keeps a valid persisted shape', () => {
		const valid: Stats = {
			played: 5,
			won: 4,
			currentStreak: 2,
			maxStreak: 3,
			lastDayIndex: 200,
			distribution: [0, 1, 2, 1, 0, 0]
		};
		store[STATS_KEY] = JSON.stringify(valid);
		expect(loadStats()).toEqual(valid);
	});
});
