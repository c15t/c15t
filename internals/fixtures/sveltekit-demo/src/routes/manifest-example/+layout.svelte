<script lang="ts">
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentDialogLink,
		ConsentManagerProvider,
		hosted,
	} from '@c15t/svelte';

	import { scripts } from '#lib/example-scripts.js';
	import { testBackend } from '#lib/test-backend.js';

	import '@c15t/svelte/styles.css';

	let { children, data } = $props();

	const mode = hosted({
		url: 'https://your-project.inth.app',
		...testBackend('url'),
	});
</script>

<ConsentManagerProvider
	{mode}
	prefetch={data.prefetch}
	{scripts}
>
	{@render children()}
	<footer>
		<ConsentDialogLink>Privacy settings</ConsentDialogLink>
	</footer>
	<ConsentBanner />
	<ConsentDialog />
</ConsentManagerProvider>
