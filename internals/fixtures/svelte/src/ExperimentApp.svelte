<script lang="ts">
	/**
	 * `App.svelte` with the banner-shape experiment. `src/main.ts` mounts it
	 * for `?experiment=1`, so the published `App.svelte` stays unchanged.
	 */
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentDialogLink,
		ConsentProvider,
		hosted,
	} from '@c15t/svelte';

	import ExamplePage from './ExamplePage.svelte';
	import {
		experimentCallbacks,
		experimentFromSearch,
	} from './experiment.svelte';
	import { scripts } from './scripts';
	import { testBackend } from './test-backend';

	const mode = hosted({
		backendURL: 'https://your-project.inth.app',
		...testBackend('backendURL'),
	});
	// `&arm=wall` sets the arm the way a flag provider would; without it
	// c15t picks one.
	const experiment = experimentFromSearch(location.search);
</script>

<ConsentProvider
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
</ConsentProvider>
