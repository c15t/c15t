<!-- #region docs:pageviews title="src/lib/pageviews.svelte" -->
<script lang="ts">
	import { page } from '$app/state';
	import { getEventDispatcher } from '@c15t/svelte';

	// Render inside ConsentProvider in the root +layout.svelte.
	const events = getEventDispatcher({ pageviews: ['posthog'] });

	$effect(() => {
		events.pageview(page.url.pathname);
	});
</script>
<!-- #endregion docs:pageviews -->
