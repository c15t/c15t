<!-- #region docs:headless-layout title="src/routes/+layout.svelte" -->
<script lang="ts">
	// #endhide docs
	import {
		ConsentDialog,
		ConsentDialogLink,
		ConsentManagerProvider,
		hosted,
	} from '@c15t/svelte';

	import CustomConsentBanner from '#lib/custom-consent-banner.svelte';
	import { scripts } from '#lib/example-scripts.js';
	// #hide docs
	import { testBackend } from '#lib/test-backend.js';

	// The stock dialog still needs the stylesheet.
	import '@c15t/svelte/styles.css';

	let { children } = $props();

	const mode = hosted({
		url: 'https://your-project.inth.app',
		// #hide docs
		...testBackend('url'),
		// #endhide docs
	});
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
