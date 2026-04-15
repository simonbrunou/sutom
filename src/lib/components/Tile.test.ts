import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Tile from './Tile.svelte';

describe('Tile', () => {
	it('renders a letter', () => {
		render(Tile, { props: { letter: 'A', state: 'tbd' } });
		expect(screen.getByText('A')).toBeInTheDocument();
	});

	it('renders empty when no letter', () => {
		render(Tile, { props: { letter: '', state: 'empty' } });
		const tile = screen.getByTestId('tile');
		expect(tile).toBeInTheDocument();
	});

	it('has correct data-state attribute for correct state', () => {
		render(Tile, { props: { letter: 'A', state: 'correct' } });
		const tile = screen.getByTestId('tile');
		expect(tile.dataset.state).toBe('correct');
	});

	it('has correct data-state attribute for misplaced state', () => {
		render(Tile, { props: { letter: 'B', state: 'misplaced' } });
		const tile = screen.getByTestId('tile');
		expect(tile.dataset.state).toBe('misplaced');
	});

	it('has correct data-state attribute for absent state', () => {
		render(Tile, { props: { letter: 'C', state: 'absent' } });
		const tile = screen.getByTestId('tile');
		expect(tile.dataset.state).toBe('absent');
	});

	it('has correct data-state for empty state', () => {
		render(Tile, { props: { letter: '', state: 'empty' } });
		const tile = screen.getByTestId('tile');
		expect(tile.dataset.state).toBe('empty');
	});

	it('has gridcell role', () => {
		render(Tile, { props: { letter: 'A', state: 'correct' } });
		const tile = screen.getByRole('gridcell');
		expect(tile).toBeInTheDocument();
	});

	it('has aria-label for correct letter', () => {
		render(Tile, { props: { letter: 'A', state: 'correct' } });
		const tile = screen.getByRole('gridcell');
		expect(tile.getAttribute('aria-label')).toBe('A, bien placée');
	});

	it('has aria-label for misplaced letter', () => {
		render(Tile, { props: { letter: 'B', state: 'misplaced' } });
		const tile = screen.getByRole('gridcell');
		expect(tile.getAttribute('aria-label')).toBe('B, mal placée');
	});

	it('has aria-label for absent letter', () => {
		render(Tile, { props: { letter: 'C', state: 'absent' } });
		const tile = screen.getByRole('gridcell');
		expect(tile.getAttribute('aria-label')).toBe('C, absente');
	});

	it('has aria-label for empty tile', () => {
		render(Tile, { props: { letter: '', state: 'empty' } });
		const tile = screen.getByRole('gridcell');
		expect(tile.getAttribute('aria-label')).toBe('Vide');
	});

	it('has aria-roledescription', () => {
		render(Tile, { props: { letter: 'A', state: 'tbd' } });
		const tile = screen.getByRole('gridcell');
		expect(tile.getAttribute('aria-roledescription')).toBe('lettre');
	});
});
