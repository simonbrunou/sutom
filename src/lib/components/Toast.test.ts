import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Toast from './Toast.svelte';

describe('Toast', () => {
	it('shows message when visible', () => {
		render(Toast, { props: { message: 'Test message', visible: true } });
		expect(screen.getByText('Test message')).toBeInTheDocument();
	});

	it('does not show when not visible', () => {
		render(Toast, { props: { message: 'Hidden message', visible: false } });
		expect(screen.queryByText('Hidden message')).not.toBeInTheDocument();
	});

	it('hides content when message is empty', () => {
		render(Toast, { props: { message: '', visible: true } });
		const toast = screen.getByTestId('toast');
		expect(toast).toHaveClass('toast-hidden');
	});

	it('has status role', () => {
		render(Toast, { props: { message: 'Alert!', visible: true } });
		const toast = screen.getByRole('status');
		expect(toast).toBeInTheDocument();
	});

	it('has aria-live polite', () => {
		render(Toast, { props: { message: 'Important', visible: true } });
		const toast = screen.getByRole('status');
		expect(toast.getAttribute('aria-live')).toBe('polite');
	});
});
