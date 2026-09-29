<script lang="ts">
	import { dev } from '$app/environment';
	import { env } from '$env/dynamic/public';
	import { createExampleScripts } from '$lib/example-scripts';
	import {
		ConsentManagerProvider,
		ConsentBanner,
		ConsentDialog,
		ConsentDialogLink,
		ConsentGate,
		hosted,
	} from '@c15t/svelte';

	import '$lib/consent-example.css';

	let { data } = $props();

	const mode = hosted({ url: env.PUBLIC_C15T_BACKEND_URL || '/api/c15t' });
	const scripts = createExampleScripts(
		env.PUBLIC_POSTHOG_KEY,
		env.PUBLIC_X_PIXEL_ID
	);
	const devTools = dev ? import('@c15t/svelte/devtools') : null;
</script>

<svelte:head>
	{#if data.themeCSS}
		<!-- generateThemeCSS escapes `<`, so its output is safe in <style>. -->
		{@html `<style id="c15t-theme">${data.themeCSS}</style>`}
	{/if}
</svelte:head>

<ConsentManagerProvider
	{mode}
	{scripts}
>
	<main class="consent-example">
		<h1>Consent example</h1>
		<p>
			PostHog waits for measurement permission. X Pixel waits for marketing
			permission.
		</p>
		<nav aria-label="Theme">
			<a href="/consent-example">Default theme</a>
			<a href="/consent-example?theme=branded">Branded theme</a>
		</nav>
		<h2>Watch the video</h2>
		<p>Allow measurement in privacy settings to load the video.</p>
		<ConsentGate category="measurement"
			><iframe
				src="https://www.youtube-nocookie.com/embed/czTksCF6X8Y"
				title="YouTube video"
				allowfullscreen
			></iframe></ConsentGate
		>
		<footer><ConsentDialogLink>Privacy settings</ConsentDialogLink></footer>
	</main>
	<ConsentBanner /><ConsentDialog />
	{#if devTools}{#await devTools then { ConsentDevTools }}<ConsentDevTools
			/>{/await}{/if}
</ConsentManagerProvider>
