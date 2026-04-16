<script>
	import '../app.css';
	import { page } from '$app/state';

	let { children } = $props();
</script>

<svelte:head>
	<meta property="og:title" content="SUTOM" />
	<meta property="og:description" content="Jeu de mots français inspiré de Wordle. Devinez le mot du jour en 6 essais !" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={page.url.href} />
	<meta property="og:image" content={`${page.url.origin}/og-image.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="SUTOM - Jeu de mots français" />
	<meta property="og:locale" content="fr_FR" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="SUTOM" />
	<meta name="twitter:description" content="Jeu de mots français inspiré de Wordle. Devinez le mot du jour en 6 essais !" />
	<meta name="twitter:image" content={`${page.url.origin}/og-image.png`} />
</svelte:head>

<a href="#game" class="sr-only">Aller au jeu</a>
{@render children()}
