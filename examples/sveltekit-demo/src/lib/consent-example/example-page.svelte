<script lang="ts">
	/**
	 * The page content every consent recipe route renders. It stands in for
	 * your application; the recipe itself lives in each route's layout.
	 */
	import ConsentDevTools from '$lib/consent-dev-tools.svelte';
	import { ConsentGate } from '@c15t/svelte';
	import type { Snippet } from 'svelte';

	import './example.css';

	/** Demo-only content shown under the navigation. */
	let { children }: { children?: Snippet } = $props();
</script>

<main class="consent-example">
	<h1>Consent example</h1>
	<p>
		PostHog waits for measurement permission. X Pixel waits for marketing
		permission.
	</p>
	<nav aria-label="Banner design">
		<a href="/consent-example">Default design</a>
		<a href="/consent-example/branded">Branded design</a>
	</nav>
	<!-- The experiment provider reads its arm at mount, so these links
	     reload the document instead of navigating on the client. -->
	<nav aria-label="Banner experiment">
		<a
			data-sveltekit-reload
			href="/experiment-example?experiment=1">Experiment</a
		>
		<a
			data-sveltekit-reload
			href="/experiment-example?experiment=1&arm=wall">Experiment (wall arm)</a
		>
	</nav>
	{@render children?.()}
	<h2>Watch the video</h2>
	<p>Allow measurement in privacy settings to load the video.</p>
	<ConsentGate category="measurement">
		<iframe
			src="https://www.youtube-nocookie.com/embed/czTksCF6X8Y"
			title="YouTube video"
			allowfullscreen
		></iframe>
	</ConsentGate>
</main>
<ConsentDevTools />
