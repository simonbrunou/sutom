<script lang="ts">
	import Modal from './Modal.svelte';

	let open = $state(false);
</script>

<!-- The trigger stands for the header buttons that open the rules and statistics modals.
	It sits before the modal in document order, as the header does on the page. -->
<button type="button" onclick={() => (open = true)}>Ouvrir</button>

<Modal {open} title="Focus" onClose={() => (open = false)}>
	<input type="text" aria-label="Mot" />
	<button type="button">Valider</button>
</Modal>
