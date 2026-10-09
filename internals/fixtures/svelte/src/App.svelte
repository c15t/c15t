<script lang="ts">
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentDialogLink,
		ConsentManagerProvider,
		hosted,
	} from '@c15t/svelte';

	import ExamplePage from './ExamplePage.svelte';
	import { scripts } from './scripts';
	import { testBackend } from './test-backend';

	const mode = hosted({
		url: 'https://your-project.inth.app',
		...testBackend('url'),
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
