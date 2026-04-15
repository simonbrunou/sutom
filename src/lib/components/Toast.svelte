<script lang="ts">
	let {
		message = '',
		visible = false
	}: {
		message?: string;
		visible?: boolean;
	} = $props();
</script>

{#if visible && message}
	<div class="toast" role="alert" aria-live="assertive" data-testid="toast">
		{message}
	</div>
{/if}

<style>
	.toast {
		position: fixed;
		top: calc(var(--header-height) + 16px);
		left: 50%;
		transform: translateX(-50%);
		background: var(--color-text);
		color: var(--color-bg);
		padding: 12px 24px;
		border-radius: 12px;
		font-weight: 600;
		font-size: 0.9rem;
		z-index: 200;
		animation: slide-up 0.3s ease;
		pointer-events: none;
		white-space: nowrap;
	}
</style>
