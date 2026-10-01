<script lang="ts">
	/**
	 * The `/consent-example` layout with the banner-shape experiment.
	 * `?experiment=1` runs it and lets c15t pick the arm; `&arm=wall` sets
	 * the arm the way a flag provider would. Without the param the provider
	 * gets no `experiment` option.
	 */
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { createExampleScripts } from '$lib/example-scripts';
	import {
		experimentCallbacks,
		experimentFromSearch,
	} from '$lib/experiment.svelte';
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentDialogLink,
		ConsentManagerProvider,
		hosted,
	} from '@c15t/svelte';

	import '@c15t/svelte/styles.css';

	let { children, data } = $props();

	const backendURL = env.PUBLIC_C15T_BACKEND_URL;
	if (!backendURL) {
		throw new Error('Set PUBLIC_C15T_BACKEND_URL to the backend URL from Inth');
	}
	const mode = hosted({ url: backendURL });
	const scripts = createExampleScripts(
		env.PUBLIC_POSTHOG_KEY,
		env.PUBLIC_X_PIXEL_ID
	);
	// Read once: the provider takes its experiment at mount.
	const experiment = experimentFromSearch(page.url.searchParams);
</script>

<ConsentManagerProvider
	callbacks={experiment ? experimentCallbacks : undefined}
	{experiment}
	{mode}
	prefetch={data.prefetch}
	{scripts}
>
	{@render children()}
	<footer>
		<ConsentDialogLink>Privacy settings</ConsentDialogLink>
	</footer>
	<ConsentBanner />
	<ConsentDialog />
</ConsentManagerProvider>
