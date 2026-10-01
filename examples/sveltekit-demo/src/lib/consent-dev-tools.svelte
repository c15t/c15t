<!-- #region docs:dev-tools title="src/lib/consent-dev-tools.svelte" -->
<script lang="ts">
	import { dev } from '$app/env';

	// Import the panel only in development, so production bundles never
	// download it.
	const devTools = dev ? import('@c15t/svelte/devtools') : null;
</script>

{#if devTools}
	{#await devTools then { ConsentDevTools }}
		<ConsentDevTools />
	{/await}
{/if}
<!-- #endregion docs:dev-tools -->
