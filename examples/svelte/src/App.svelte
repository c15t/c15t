<!-- #region docs:app -->
<script lang="ts">
	import { posthog } from '@c15t/integrations/posthog';
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentDialogLink,
		ConsentProvider,
		manifest,
	} from '@c15t/svelte';

	const scripts = [
		posthog({
			id: 'phc_your_project_key',
			initOptions: { cookieless_mode: 'never' },
			loadMode: 'after-consent',
		}),
	];
</script>

<ConsentProvider
	mode={manifest()}
	{scripts}
>
	<main>
		<h1>c15t + Svelte</h1>
		<p>Your app goes here.</p>
	</main>
	<footer>
		<ConsentDialogLink>Privacy settings</ConsentDialogLink>
	</footer>
	<ConsentBanner />
	<ConsentDialog />
</ConsentProvider>
<!-- #endregion docs:app -->
