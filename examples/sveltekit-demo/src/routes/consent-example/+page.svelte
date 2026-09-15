<script lang="ts">
	import { dev } from '$app/environment';
	import { env } from '$env/dynamic/public';
	import { createExampleScripts } from '$lib/example-scripts';
	import {
		ConsentManagerProvider,
		ConsentBanner,
		ConsentDialog,
		ConsentDialogLink,
		Frame,
		hosted,
	} from '@c15t/svelte';
	import { onDestroy } from 'svelte';

	import '$lib/consent-example.css';

	const mode = hosted({ url: env.PUBLIC_C15T_BACKEND_URL || '/api/c15t' });
	const scripts = createExampleScripts(
		env.PUBLIC_POSTHOG_KEY,
		env.PUBLIC_X_PIXEL_ID
	);
	const devTools = dev ? import('@c15t/svelte/devtools') : null;
	const setTheme = (theme: string) => {
		document.documentElement.dataset.consentExampleTheme = theme;
	};
	onDestroy(() => {
		if (typeof document !== 'undefined') {
			delete document.documentElement.dataset.consentExampleTheme;
		}
	});
</script>

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
		<button
			type="button"
			onclick={() => setTheme('default')}>Default theme</button
		>
		<button
			type="button"
			onclick={() => setTheme('branded')}>Branded theme</button
		>
		<h2>Watch the video</h2>
		<p>Allow measurement in privacy settings to load the video.</p>
		<Frame category="measurement"
			><iframe
				src="https://www.youtube-nocookie.com/embed/czTksCF6X8Y"
				title="YouTube video"
				allowfullscreen
			></iframe></Frame
		>
		<footer><ConsentDialogLink>Privacy settings</ConsentDialogLink></footer>
	</main>
	<ConsentBanner /><ConsentDialog />
	{#if devTools}{#await devTools then { ConsentDevTools }}<ConsentDevTools
			/>{/await}{/if}
</ConsentManagerProvider>
