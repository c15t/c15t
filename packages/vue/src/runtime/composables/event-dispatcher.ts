import { getEventDispatcher } from '@c15t/core/events';
import type {
	EventDispatcher,
	RuntimeEventDispatcherOptions,
} from '@c15t/core/events';
import { toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

import { useConsentKernelContext } from './kernel';

/**
 * Get the app's event dispatcher.
 *
 * It delivers to the `scripts` in the c15t config, plus any you pass, and
 * checks consent when it sends, so a revoked category stops the next event.
 * Every dispatcher in the app shares one pageview history, so a component
 * that mounts again does not replay a navigation.
 *
 * @param options - Extra `scripts`, SPA `pageviews` integrations and
 * injectable `globals`. A ref or getter is read on each call.
 * @returns A dispatcher with `track` and `pageview`.
 * @throws {Error} When the c15t plugin is not installed.
 * @example
 * ```ts
 * const events = useEventDispatcher({ pageviews: ['posthog'] });
 * const route = useRoute();
 * watch(() => route.fullPath, (path) => events.pageview(path), { immediate: true });
 * ```
 */
export const useEventDispatcher = function useEventDispatcher(
	options: MaybeRefOrGetter<RuntimeEventDispatcherOptions> = {}
): EventDispatcher {
	const { runtime } = useConsentKernelContext();
	const current = () => getEventDispatcher(runtime, toValue(options));
	return {
		pageview: (path) => current().pageview(path),
		track: (event, properties) => current().track(event, properties),
	};
};

export type { EventDispatcher, EventProperties } from '@c15t/core/events';
export type { RuntimeEventDispatcherOptions as UseEventDispatcherOptions };
