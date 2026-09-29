<script lang="ts">
	/**
	 * The page content every consent recipe route renders. It stands in for
	 * your application; the recipe itself lives in each route's layout.
	 */
	import { dev } from '$app/environment';
	import { ConsentGate } from '@c15t/svelte';

	import './example.css';

	const devTools = dev ? import('@c15t/svelte/devtools') : null;
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
{#if devTools}
	{#await devTools then { ConsentDevTools }}
		<ConsentDevTools />
	{/await}
{/if}
