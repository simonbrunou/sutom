import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Board from './Board.svelte';
import type { TileData } from '$lib/game';

function makeEmptyRow(length: number): TileData[] {
	return Array.from({ length }, () => ({ letter: '', state: 'empty' as const }));
}

function makeRow(letters: string, states: Array<TileData['state']>): TileData[] {
	return letters.split('').map((letter, i) => ({ letter, state: states[i] }));
}

describe('Board', () => {
	it('renders the board', () => {
		const grid = [makeEmptyRow(5), makeEmptyRow(5), makeEmptyRow(5)];
		render(Board, { props: { grid } });
		const board = screen.getByTestId('board');
		expect(board).toBeInTheDocument();
	});

	it('renders correct number of rows', () => {
		const grid = [makeEmptyRow(5), makeEmptyRow(5), makeEmptyRow(5), makeEmptyRow(5)];
		render(Board, { props: { grid } });
		const rows = screen.getAllByTestId('row');
		expect(rows).toHaveLength(4);
	});

	it('renders tiles within rows', () => {
		const grid = [
			makeRow('ARBRE', ['correct', 'correct', 'correct', 'correct', 'correct']),
			makeEmptyRow(5)
		];
		render(Board, { props: { grid, currentRowIndex: 1 } });
		const tiles = screen.getAllByTestId('tile');
		expect(tiles).toHaveLength(10); // 2 rows * 5 tiles
	});

	it('has grid role', () => {
		const grid = [makeEmptyRow(5)];
		render(Board, { props: { grid } });
		const board = screen.getByRole('grid');
		expect(board).toBeInTheDocument();
	});

	it('has aria-label', () => {
		const grid = [makeEmptyRow(5)];
		render(Board, { props: { grid } });
		const board = screen.getByRole('grid');
		expect(board.getAttribute('aria-label')).toBe('Grille de jeu');
	});

	it('displays letters in tiles', () => {
		const grid = [
			makeRow('AB', ['tbd', 'tbd']),
			makeEmptyRow(2)
		];
		render(Board, { props: { grid } });
		expect(screen.getByText('A')).toBeInTheDocument();
		expect(screen.getByText('B')).toBeInTheDocument();
	});
});
