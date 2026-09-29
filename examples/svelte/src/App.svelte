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

	const backendURL = import.meta.env.VITE_C15T_BACKEND_URL;
	if (!backendURL) {
		throw new Error('Set VITE_C15T_BACKEND_URL to the backend URL from Inth');
	}
	const mode = hosted({ url: backendURL });
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
