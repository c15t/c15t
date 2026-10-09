<!-- #region docs:app -->
<script lang="ts">
	import { manifest } from '@c15t/browser/headless';
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentDialogLink,
		ConsentManagerProvider,
	} from '@c15t/svelte';
	// The policy consentManifest() in vite.config.ts downloaded.
	import { snapshot } from 'c15t/generated';

	import { scripts } from './scripts';

	const mode = manifest({
		// Consent choices still go to the backend.
		backendURL: import.meta.env.VITE_C15T_BACKEND_URL,
		manifest: snapshot,
	});
</script>

<ConsentManagerProvider
	{mode}
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
</ConsentManagerProvider>
<!-- #endregion docs:app -->
