import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ModalTestWrapper from './ModalTestWrapper.svelte';

describe('Modal', () => {
	it('renders when open is true', () => {
		render(ModalTestWrapper, { props: { open: true, title: 'Test Modal' } });
		expect(screen.getByTestId('modal')).toBeInTheDocument();
	});

	it('does not render when open is false', () => {
		render(ModalTestWrapper, { props: { open: false, title: 'Hidden' } });
		expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
	});

	it('displays the title', () => {
		render(ModalTestWrapper, { props: { open: true, title: 'My Title' } });
		expect(screen.getByText('My Title')).toBeInTheDocument();
	});

	it('renders children content', () => {
		render(ModalTestWrapper, { props: { open: true, title: 'Test' } });
		expect(screen.getByText('Modal content')).toBeInTheDocument();
	});

	it('has dialog role', () => {
		render(ModalTestWrapper, { props: { open: true, title: 'Dialog' } });
		const dialog = screen.getByRole('dialog');
		expect(dialog).toBeInTheDocument();
	});

	it('has aria-modal attribute', () => {
		render(ModalTestWrapper, { props: { open: true, title: 'Modal' } });
		const dialog = screen.getByRole('dialog');
		expect(dialog.getAttribute('aria-modal')).toBe('true');
	});

	it('has aria-labelledby pointing to title', () => {
		render(ModalTestWrapper, { props: { open: true, title: 'Labeled' } });
		const dialog = screen.getByRole('dialog');
		expect(dialog.getAttribute('aria-labelledby')).toBe('modal-title');
		expect(screen.getByText('Labeled').id).toBe('modal-title');
	});

	it('has close button with aria-label', () => {
		render(ModalTestWrapper, { props: { open: true, title: 'Close Test' } });
		const closeBtn = screen.getByTestId('modal-close');
		expect(closeBtn.getAttribute('aria-label')).toBe('Fermer');
	});

	it('calls onClose when close button is clicked', async () => {
		const result = render(ModalTestWrapper, { props: { open: true, title: 'Close' } });
		const closeBtn = screen.getByTestId('modal-close');
		await fireEvent.click(closeBtn);
		// The wrapper handles the close event
		expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
	});

	it('calls onClose on Escape key', async () => {
		render(ModalTestWrapper, { props: { open: true, title: 'Escape' } });
		const dialog = screen.getByRole('dialog');
		await fireEvent.keyDown(dialog, { key: 'Escape' });
		expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
	});

	it('calls onClose on backdrop click', async () => {
		render(ModalTestWrapper, { props: { open: true, title: 'Backdrop' } });
		const backdrop = screen.getByTestId('modal');
		await fireEvent.click(backdrop);
		expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
	});
});
