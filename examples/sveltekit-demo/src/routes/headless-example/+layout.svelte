<!-- #region docs:headless-layout title="src/routes/+layout.svelte" -->
<script lang="ts">
	import { env } from '$env/dynamic/public';
	import CustomConsentBanner from '$lib/custom-consent-banner.svelte';
	import { createExampleScripts } from '$lib/example-scripts';
	import {
		ConsentDialog,
		ConsentDialogLink,
		ConsentManagerProvider,
		hosted,
	} from '@c15t/svelte';

	// The stock dialog still needs the stylesheet.
	import '@c15t/svelte/styles.css';

	let { children } = $props();

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
	{scripts}
>
	{@render children()}
	<footer>
		<ConsentDialogLink>Privacy settings</ConsentDialogLink>
	</footer>
	<CustomConsentBanner />
	<ConsentDialog />
</ConsentManagerProvider>
<!-- #endregion docs:headless-layout -->
