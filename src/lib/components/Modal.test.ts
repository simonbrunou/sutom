import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ModalTestWrapper from './ModalTestWrapper.svelte';
import ModalFocusTestWrapper from './ModalFocusTestWrapper.svelte';

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
		render(ModalTestWrapper, { props: { open: true, title: 'Close' } });
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

describe('Modal focus', () => {
	// Opens the modal from its trigger and waits for the focus Modal moves to its first
	// focusable element, the close button, in a requestAnimationFrame.
	async function openFromTrigger() {
		const user = userEvent.setup();
		render(ModalFocusTestWrapper);
		const trigger = screen.getByRole('button', { name: 'Ouvrir' });
		await user.click(trigger);
		const close = screen.getByTestId('modal-close');
		await waitFor(() => expect(close).toHaveFocus());
		return {
			user,
			trigger,
			close,
			input: screen.getByRole('textbox', { name: 'Mot' }),
			last: screen.getByRole('button', { name: 'Valider' })
		};
	}

	it('focuses the close button when it opens', async () => {
		await openFromTrigger();
	});

	it('moves focus from the last element to the close button on Tab', async () => {
		const { user, close, last } = await openFromTrigger();
		last.focus();
		expect(last).toHaveFocus();
		await user.tab();
		expect(close).toHaveFocus();
	});

	it('moves focus from the close button to the last element on Shift+Tab', async () => {
		const { user, last } = await openFromTrigger();
		await user.tab({ shift: true });
		expect(last).toHaveFocus();
	});

	it('leaves Tab between inner elements to the browser', async () => {
		const { user, input, last } = await openFromTrigger();
		input.focus();
		expect(input).toHaveFocus();
		await user.tab();
		expect(last).toHaveFocus();
	});

	it('leaves Shift+Tab between inner elements to the browser', async () => {
		const { user, input, last } = await openFromTrigger();
		last.focus();
		expect(last).toHaveFocus();
		await user.tab({ shift: true });
		expect(input).toHaveFocus();
	});

	it('gives focus back to the trigger when the close button closes it', async () => {
		const { user, trigger, close } = await openFromTrigger();
		await user.click(close);
		expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
		expect(trigger).toHaveFocus();
	});

	it('gives focus back to the trigger when Escape closes it', async () => {
		const { user, trigger } = await openFromTrigger();
		await user.keyboard('{Escape}');
		expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
		expect(trigger).toHaveFocus();
	});
});
