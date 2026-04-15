<script lang="ts">
	import Modal from './Modal.svelte';

	let { open: initialOpen = false, title = '' }: { open?: boolean; title?: string } = $props();

	let isOpen = $state(false);

	$effect(() => {
		isOpen = initialOpen;
	});

	function handleClose() {
		isOpen = false;
	}
</script>

<Modal open={isOpen} {title} onClose={handleClose}>
	<p>Modal content</p>
</Modal>
