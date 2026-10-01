<script lang="ts">
	/**
	 * `App.svelte` with the banner-shape experiment. `src/main.ts` mounts it
	 * for `?experiment=1`, so the published `App.svelte` stays unchanged.
	 */
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentDialogLink,
		ConsentManagerProvider,
		hosted,
	} from '@c15t/svelte';

	import '@c15t/svelte/styles.css';
	import ExamplePage from './ExamplePage.svelte';
	import {
		experimentCallbacks,
		experimentFromSearch,
	} from './experiment.svelte';
	import { scripts } from './scripts';

	const backendURL = import.meta.env.VITE_C15T_BACKEND_URL;
	if (!backendURL) {
		throw new Error('Set VITE_C15T_BACKEND_URL to the backend URL from Inth');
	}
	const mode = hosted({ url: backendURL });
	// `&arm=wall` sets the arm the way a flag provider would; without it
	// c15t picks one.
	const experiment = experimentFromSearch(location.search);
</script>

<ConsentManagerProvider
	callbacks={experimentCallbacks}
	{experiment}
	{mode}
	{scripts}
>
	<ExamplePage experiment />
	<footer>
		<ConsentDialogLink>Privacy settings</ConsentDialogLink>
	</footer>
	<ConsentBanner />
	<ConsentDialog />
</ConsentManagerProvider>
