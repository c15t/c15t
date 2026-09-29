<script lang="ts">
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentManagerProvider,
		hosted,
	} from '@c15t/svelte';
	import { DevTools } from '@c15t/svelte/devtools';

	import '@c15t/svelte/styles.css';
	import { experimentFromSearch } from './experiment.svelte';
	import Gallery from './Gallery.svelte';
	import { scripts } from './scripts';

	const backendURL = import.meta.env.VITE_C15T_BACKEND_URL;
	if (!backendURL) {
		throw new Error('Set VITE_C15T_BACKEND_URL to your Inth endpoint');
	}
	const mode = hosted({ url: backendURL });
	const branded =
		new URLSearchParams(location.search).get('design') === 'branded';
	const theme = branded
		? {
				colors: {
					primary: '#6943a3',
					primaryHover: '#533285',
					textOnPrimary: '#ffffff',
				},
				radius: { lg: '18px' },
			}
		: undefined;
	// `?experiment=1` runs the banner-shape experiment; `&arm=wall` forces
	// the arm. Without the param the provider gets no `experiment` option.
	const experiment = experimentFromSearch(location.search);
</script>

<ConsentManagerProvider
	{experiment}
	{mode}
	{scripts}
	{theme}
>
	<Gallery experimentConfigured={Boolean(experiment)} /><ConsentBanner
	/><ConsentDialog /><DevTools />
</ConsentManagerProvider>
