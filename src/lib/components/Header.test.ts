import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Header from './Header.svelte';

describe('Header', () => {
	it('renders the title SUTOM', () => {
		render(Header, { props: { onShowRules: vi.fn(), onShowStats: vi.fn() } });
		expect(screen.getByText('S')).toBeInTheDocument();
		expect(screen.getByText('U')).toBeInTheDocument();
		expect(screen.getByText('T')).toBeInTheDocument();
		expect(screen.getByText('O')).toBeInTheDocument();
		expect(screen.getByText('M')).toBeInTheDocument();
	});

	it('renders rules button with aria-label', () => {
		render(Header, { props: { onShowRules: vi.fn(), onShowStats: vi.fn() } });
		const rulesBtn = screen.getByLabelText('Règles du jeu');
		expect(rulesBtn).toBeInTheDocument();
	});

	it('renders stats button with aria-label', () => {
		render(Header, { props: { onShowRules: vi.fn(), onShowStats: vi.fn() } });
		const statsBtn = screen.getByLabelText('Statistiques');
		expect(statsBtn).toBeInTheDocument();
	});

	it('calls onShowRules when rules button is clicked', async () => {
		const onShowRules = vi.fn();
		render(Header, { props: { onShowRules, onShowStats: vi.fn() } });
		await fireEvent.click(screen.getByLabelText('Règles du jeu'));
		expect(onShowRules).toHaveBeenCalledOnce();
	});

	it('calls onShowStats when stats button is clicked', async () => {
		const onShowStats = vi.fn();
		render(Header, { props: { onShowRules: vi.fn(), onShowStats } });
		await fireEvent.click(screen.getByLabelText('Statistiques'));
		expect(onShowStats).toHaveBeenCalledOnce();
	});
});
