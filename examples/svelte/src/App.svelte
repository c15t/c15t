<script lang="ts">
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentManagerProvider,
		hosted,
	} from '@c15t/svelte';
	import { DevTools } from '@c15t/svelte/devtools';

	import '@c15t/svelte/styles.css';
	import Gallery from './Gallery.svelte';
	import { scripts } from './scripts';

	const backendURL = import.meta.env.VITE_C15T_BACKEND_URL;
	if (!backendURL) {
		throw new Error('Set VITE_C15T_BACKEND_URL to your Inth endpoint');
	}
	const mode = hosted({ url: backendURL });
	// The provider does not turn theme tokens into CSS. The Branded tokens
	// are plain CSS variables in style.css, under [data-design='branded'].
	if (new URLSearchParams(location.search).get('design') === 'branded') {
		document.documentElement.dataset.design = 'branded';
	}
</script>

<ConsentManagerProvider
	{mode}
	{scripts}
>
	<Gallery /><ConsentBanner /><ConsentDialog /><DevTools />
</ConsentManagerProvider>
