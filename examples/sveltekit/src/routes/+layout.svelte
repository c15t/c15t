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

	let { children, data } = $props();

	const mode = hosted({
		// The route resolves from the bundled policy, so each save asserts the
		// decision it was made against.
		assertDecisionInputs: true,
		backendURL: PUBLIC_C15T_BACKEND_URL,
		// Where the browser resolves consent when the server did not, such as
		// on a prerendered page. Saves still go to `backendURL`.
		initURL: '/api/c15t',
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
