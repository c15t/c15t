<script lang="ts">
	/**
	 * The `/consent-example` layout with the banner-shape experiment.
	 * `?experiment=1` runs it and lets c15t pick the arm; `&arm=wall` sets
	 * the arm the way a flag provider would. Without the param the provider
	 * gets no `experiment` option.
	 */
	import { page } from '$app/state';
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentDialogLink,
		ConsentManagerProvider,
		hosted,
	} from '@c15t/svelte';

	import { scripts } from '#lib/example-scripts.js';
	import {
		experimentCallbacks,
		experimentFromSearch,
	} from '#lib/experiment.svelte.js';
	import { testBackend } from '#lib/test-backend.js';

	let { children, data } = $props();

	const mode = hosted({
		url: 'https://your-project.inth.app',
		...testBackend('url'),
	});
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
