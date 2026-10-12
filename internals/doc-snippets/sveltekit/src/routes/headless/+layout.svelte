<!-- #region docs:headless-layout title="src/routes/+layout.svelte" -->
<script lang="ts">
	import {
		ConsentDialog,
		ConsentDialogLink,
		ConsentProvider,
		hosted,
	} from '@c15t/svelte';

	import CustomConsentBanner from '#lib/custom-consent-banner.svelte';
	import { scripts } from '#lib/scripts.js';

	let { children } = $props();

	const mode = hosted({ backendURL: 'https://your-project.inth.app' });
</script>

<ConsentProvider
	{mode}
	{scripts}
>
	{@render children()}
	<footer>
		<ConsentDialogLink>Privacy settings</ConsentDialogLink>
	</footer>
	<CustomConsentBanner />
	<ConsentDialog />
</ConsentProvider>
<!-- #endregion docs:headless-layout -->
