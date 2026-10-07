<!-- #region docs:app -->
<script lang="ts">
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentDialogLink,
		ConsentManagerProvider,
		hosted,
	} from '@c15t/svelte';

	import '@c15t/svelte/styles.css';
	import { scripts } from './scripts';

	const mode = hosted({ url: 'https://your-project.inth.app' });
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
