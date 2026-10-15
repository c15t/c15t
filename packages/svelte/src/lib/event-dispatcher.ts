import { getEventDispatcher as getRuntimeEventDispatcher } from '@c15t/core/events';
import type {
	EventDispatcher,
	RuntimeEventDispatcherOptions,
} from '@c15t/core/events';

import { getConsentContext } from './context.svelte';

/**
 * Get the app's event dispatcher. Call it while a component initialises,
 * inside `<ConsentProvider>`.
 *
 * It delivers to the provider's `scripts`, plus any you pass, and checks
 * consent when it sends, so a revoked category stops the next event. Every
 * dispatcher under the provider shares one pageview history, so a component
 * that mounts again does not replay a navigation.
 *
 * @param options - Extra `scripts`, SPA `pageviews` integrations and
 * injectable `globals`. Pass a getter to read reactive values on each call.
 * @returns A dispatcher with `track` and `pageview`.
 * @throws {Error} When no `<ConsentProvider>` is above the component.
 * @example
 * ```svelte
 * <script lang="ts">
 * 	import { page } from '$app/state';
 * 	import { getEventDispatcher } from '@c15t/svelte';
 *
 * 	const events = getEventDispatcher({ pageviews: ['posthog'] });
 * 	$effect(() => events.pageview(page.url.pathname));
 * </script>
 * ```
 */
export const getEventDispatcher = function getEventDispatcher(
	options:
		| RuntimeEventDispatcherOptions
		| (() => RuntimeEventDispatcherOptions) = {}
): EventDispatcher {
	const { runtime } = getConsentContext();
	const current = () =>
		getRuntimeEventDispatcher(
			runtime,
			typeof options === 'function' ? options() : options
		);
	return {
		pageview: (path) => current().pageview(path),
		track: (event, properties) => current().track(event, properties),
	};
};

export type { EventDispatcher, EventProperties } from '@c15t/core/events';
export type { RuntimeEventDispatcherOptions as GetEventDispatcherOptions };
