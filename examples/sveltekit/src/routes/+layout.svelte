<!-- #region docs:layout -->
<script lang="ts">
	import { PUBLIC_C15T_BACKEND_URL } from '$app/env/public';
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentDialogLink,
		ConsentManagerProvider,
		hosted,
	} from '@c15t/svelte';

	import { scripts } from '#lib/scripts.js';

	import '@c15t/svelte/styles.css';

	let { children, data } = $props();

	const mode = hosted({
		// The route resolves from the bundled policy, so each save asserts the
		// decision it was made against.
		assertDecisionInputs: true,
		// Where the browser resolves consent when the server did not, such as
		// on a prerendered page. Saves still go to `url`.
		initURL: '/api/c15t',
		url: PUBLIC_C15T_BACKEND_URL,
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
<!-- #endregion docs:layout -->
