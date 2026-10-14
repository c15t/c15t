<!-- #region docs:analytics-events title="app/components/Pageviews.vue" -->
<script setup lang="ts">
// Render <Pageviews /> once in app.vue.
const events = useEventDispatcher({ pageviews: ['posthog'] });
const route = useRoute();
watch(
	() => route.fullPath,
	(path) => events.pageview(path),
	{ immediate: true }
);
</script>

<template>
	<slot />
</template>
<!-- #endregion docs:analytics-events -->
