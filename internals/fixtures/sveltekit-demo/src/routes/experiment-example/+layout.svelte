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
		ConsentRoot,
	} from '@c15t/svelte';

	import { scripts } from '#lib/example-scripts.js';
	import {
		experimentCallbacks,
		experimentFromSearch,
	} from '#lib/experiment.svelte.js';

	import '@c15t/svelte/styles.css';

	let { children, data } = $props();

	// Read once: the provider takes its experiment at mount.
	const experiment = experimentFromSearch(page.url.searchParams);
</script>

<ConsentRoot
	callbacks={experiment ? experimentCallbacks : undefined}
	{experiment}
	state={data.consent}
	{scripts}
>
	{@render children()}
	<footer>
		<ConsentDialogLink>Privacy settings</ConsentDialogLink>
	</footer>
	<ConsentBanner />
	<ConsentDialog />
</ConsentRoot>
