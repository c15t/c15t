<script lang="ts">
	// #endhide docs
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentDialogLink,
		ConsentManagerProvider,
		hosted,
	} from '@c15t/svelte';

	import { scripts } from '#lib/example-scripts.js';
	// #hide docs
	import { testBackend } from '#lib/test-backend.js';

	import '@c15t/svelte/styles.css';

	let { children, data } = $props();

	const mode = hosted({
		url: 'https://your-project.inth.app',
		// #hide docs
		...testBackend('url'),
		// #endhide docs
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
