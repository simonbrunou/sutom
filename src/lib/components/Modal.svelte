<script lang="ts">
	import { onMount } from 'svelte';

	let {
		open = false,
		title = '',
		onClose,
		children
	}: {
		open?: boolean;
		title?: string;
		onClose: () => void;
		children: any;
	} = $props();

	let dialogEl: HTMLDivElement | undefined = $state();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	onMount(() => {
		if (open && dialogEl) {
			const focusable = dialogEl.querySelector<HTMLElement>('button, [tabindex]');
			focusable?.focus();
		}
	});
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="-1"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		data-testid="modal"
	>
		<div class="modal-panel" bind:this={dialogEl}>
			<div class="modal-header">
				<h2 id="modal-title" class="modal-title">{title}</h2>
				<button
					class="modal-close"
					onclick={onClose}
					aria-label="Fermer"
					data-testid="modal-close"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18"/>
						<line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>
			<div class="modal-body">
				{@render children()}
			</div>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		z-index: 100;
		animation: fade-in 0.2s ease;
		padding: 16px;
	}

	.modal-panel {
		background: linear-gradient(155deg, #1f1540 0%, #160d2c 100%);
		border: 1px solid var(--color-border);
		border-radius: 22px;
		width: 100%;
		max-width: 440px;
		max-height: 86vh;
		overflow-y: auto;
		animation: scale-in 0.28s var(--ease-out);
		box-shadow:
			0 30px 60px rgba(0, 0, 0, 0.5),
			inset 0 1px 0 rgba(255, 255, 255, 0.06);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 24px 4px;
	}

	.modal-title {
		font-size: 1.3rem;
		font-weight: 800;
		letter-spacing: -0.01em;
		color: var(--color-text);
	}

	.modal-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: var(--color-surface);
		color: var(--color-text-muted);
		transition: all 0.2s ease;
	}

	.modal-close:hover {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	.modal-close:active {
		transform: scale(0.92);
	}

	.modal-body {
		padding: 16px 24px 24px;
	}
</style>
