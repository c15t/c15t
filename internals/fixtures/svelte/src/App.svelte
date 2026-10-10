<script lang="ts">
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentDialogLink,
		ConsentProvider,
		hosted,
	} from '@c15t/svelte';

	import ExamplePage from './ExamplePage.svelte';
	import { scripts } from './scripts';
	import { testBackend } from './test-backend';

	const mode = hosted({
		backendURL: 'https://your-project.inth.app',
		...testBackend('backendURL'),
	});
</script>

<ConsentProvider
	{mode}
	{scripts}
>
	<ExamplePage />
	<footer>
		<ConsentDialogLink>Privacy settings</ConsentDialogLink>
	</footer>
	<ConsentBanner />
	<ConsentDialog />
</ConsentProvider>
