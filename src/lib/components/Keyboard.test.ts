import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Keyboard from './Keyboard.svelte';

describe('Keyboard', () => {
	it('renders the keyboard', () => {
		render(Keyboard, { props: { keyStates: {}, onKey: vi.fn() } });
		const keyboard = screen.getByTestId('keyboard');
		expect(keyboard).toBeInTheDocument();
	});

	it('renders all AZERTY letter keys', () => {
		render(Keyboard, { props: { keyStates: {}, onKey: vi.fn() } });
		const azertyLetters = 'AZERTYUIOPQSDFGHJKLMWXCVBN';
		for (const letter of azertyLetters) {
			expect(screen.getByTestId(`key-${letter}`)).toBeInTheDocument();
		}
	});

	it('renders Enter key', () => {
		render(Keyboard, { props: { keyStates: {}, onKey: vi.fn() } });
		expect(screen.getByTestId('key-ENTER')).toBeInTheDocument();
	});

	it('renders Backspace key', () => {
		render(Keyboard, { props: { keyStates: {}, onKey: vi.fn() } });
		expect(screen.getByTestId('key-BACK')).toBeInTheDocument();
	});

	it('calls onKey when a letter key is clicked', async () => {
		const onKey = vi.fn();
		render(Keyboard, { props: { keyStates: {}, onKey } });
		await fireEvent.click(screen.getByTestId('key-A'));
		expect(onKey).toHaveBeenCalledWith('A');
	});

	it('calls onKey with ENTER when enter is clicked', async () => {
		const onKey = vi.fn();
		render(Keyboard, { props: { keyStates: {}, onKey } });
		await fireEvent.click(screen.getByTestId('key-ENTER'));
		expect(onKey).toHaveBeenCalledWith('ENTER');
	});

	it('calls onKey with BACK when backspace is clicked', async () => {
		const onKey = vi.fn();
		render(Keyboard, { props: { keyStates: {}, onKey } });
		await fireEvent.click(screen.getByTestId('key-BACK'));
		expect(onKey).toHaveBeenCalledWith('BACK');
	});

	it('has correct aria-label on keyboard group', () => {
		render(Keyboard, { props: { keyStates: {}, onKey: vi.fn() } });
		const keyboard = screen.getByRole('group');
		expect(keyboard.getAttribute('aria-label')).toBe('Clavier');
	});

	it('has correct aria-label for Enter key', () => {
		render(Keyboard, { props: { keyStates: {}, onKey: vi.fn() } });
		const enterKey = screen.getByTestId('key-ENTER');
		expect(enterKey.getAttribute('aria-label')).toBe('Valider');
	});

	it('has correct aria-label for Backspace key', () => {
		render(Keyboard, { props: { keyStates: {}, onKey: vi.fn() } });
		const backKey = screen.getByTestId('key-BACK');
		expect(backKey.getAttribute('aria-label')).toBe('Effacer');
	});

	it('applies correct state class to keys', () => {
		render(Keyboard, {
			props: {
				keyStates: { A: 'correct', B: 'misplaced', C: 'absent' },
				onKey: vi.fn()
			}
		});
		const keyA = screen.getByTestId('key-A');
		const keyB = screen.getByTestId('key-B');
		const keyC = screen.getByTestId('key-C');
		expect(keyA.className).toContain('key-correct');
		expect(keyB.className).toContain('key-misplaced');
		expect(keyC.className).toContain('key-absent');
	});
});
