<script lang="ts">
	import {
		ConsentDialog,
		ConsentDialogLink,
		ConsentManagerProvider,
		hosted,
	} from '@c15t/svelte';

	import CustomConsentBanner from '#lib/custom-consent-banner.svelte';
	import { scripts } from '#lib/example-scripts.js';
	import { testBackend } from '#lib/test-backend.js';

	// The stock dialog still needs the stylesheet.
	import '@c15t/svelte/styles.css';

	let { children } = $props();

	const mode = hosted({
		url: 'https://your-project.inth.app',
		...testBackend('url'),
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
