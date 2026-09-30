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
	import ExamplePage from './ExamplePage.svelte';
	import { scripts } from './scripts';
	// #hide docs
	import { testBackend } from './test-backend';
	// #endhide docs

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
	<ExamplePage />
	<footer>
		<ConsentDialogLink>Privacy settings</ConsentDialogLink>
	</footer>
	<ConsentBanner />
	<ConsentDialog />
</ConsentManagerProvider>
<!-- #endregion docs:app -->
