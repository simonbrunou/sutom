<script lang="ts">
	let {
		message = '',
		visible = false,
		variant = 'default' as 'default' | 'success' | 'error' | 'info'
	}: {
		message?: string;
		visible?: boolean;
		variant?: 'default' | 'success' | 'error' | 'info';
	} = $props();
</script>

{#if visible && message}
	<div
		class="toast toast-{variant}"
		role="alert"
		aria-live="assertive"
		data-testid="toast"
	>
		<span class="toast-text">{message}</span>
	</div>
{/if}

<style>
	.toast {
		position: fixed;
		top: calc(var(--header-height) + 14px);
		left: 50%;
		transform: translateX(-50%);
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 11px 20px;
		border-radius: 999px;
		background: rgba(245, 243, 251, 0.96);
		color: #1a1230;
		font-weight: 700;
		font-size: 0.92rem;
		letter-spacing: 0.01em;
		z-index: 200;
		animation: slide-down 0.3s var(--ease-out);
		pointer-events: none;
		white-space: nowrap;
		box-shadow:
			0 10px 30px rgba(0, 0, 0, 0.35),
			inset 0 1px 0 rgba(255, 255, 255, 0.6);
		max-width: calc(100vw - 32px);
	}

	.toast-text {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.toast-success {
		background: linear-gradient(135deg, #8778f5, #6c5ce7);
		color: #ffffff;
		box-shadow:
			0 10px 30px rgba(108, 92, 231, 0.45),
			inset 0 1px 0 rgba(255, 255, 255, 0.18);
	}

	.toast-error {
		background: linear-gradient(135deg, #ff6ab0, #e84393);
		color: #ffffff;
		box-shadow:
			0 10px 30px rgba(232, 67, 147, 0.45),
			inset 0 1px 0 rgba(255, 255, 255, 0.18);
	}

	.toast-info {
		background: linear-gradient(135deg, #ffd98a, #fdcb6e);
		color: #1a1230;
		box-shadow:
			0 10px 30px rgba(253, 203, 110, 0.4),
			inset 0 1px 0 rgba(255, 255, 255, 0.4);
	}
</style>
