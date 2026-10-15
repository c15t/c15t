<!-- #region docs:analytics-events title="src/pageviews.svelte" -->
<script lang="ts">
	import { getEventDispatcher } from '@c15t/svelte';

	// Render inside ConsentProvider, passing your router's current path.
	const { path }: { path: string } = $props();
	const events = getEventDispatcher({ pageviews: ['posthog'] });

	$effect(() => {
		events.pageview(path);
	});
</script>
<!-- #endregion docs:analytics-events -->
