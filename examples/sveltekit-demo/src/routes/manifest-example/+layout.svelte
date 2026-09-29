<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { createExampleScripts } from '$lib/example-scripts';
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
</script>

<ConsentManagerProvider
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
