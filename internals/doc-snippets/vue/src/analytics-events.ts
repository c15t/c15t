// #region docs:analytics-events title="src/analytics-events.ts"
import { useEventDispatcher } from 'c15t/vue/vue-plugin';
import { watch } from 'vue';

/**
 * Sends a PostHog pageview for each new path. Call it from a component's
 * `setup`, such as `App.vue`, with a getter for your router's path, such as
 * `() => useRoute().fullPath` from Vue Router.
 */
export const usePageviews = (path: () => string) => {
	const events = useEventDispatcher({ pageviews: ['posthog'] });
	watch(path, (current) => events.pageview(current), { immediate: true });
};
// #endregion docs:analytics-events
