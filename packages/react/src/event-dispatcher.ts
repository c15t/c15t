'use client';

import { getEventDispatcher } from '@c15t/core/events';
import type {
	EventDispatcher,
	RuntimeEventDispatcherOptions,
} from '@c15t/core/events';
import { useContext, useMemo } from 'react';

import { ProviderServicesContext } from './context';
import { useCommittedRef } from './hooks/use-committed-ref';

/**
 * Get the provider's event dispatcher.
 *
 * It delivers to the scripts the provider registered, plus any you pass, and
 * checks consent when it sends, so a revoked category stops the next event.
 * The returned object stays the same for the provider's lifetime, and
 * pageview de-duplication survives navigation, consent changes and the
 * `enabled` toggle.
 *
 * @param options - Extra `scripts`, SPA `pageviews` integrations and
 * injectable `globals`. The latest committed options apply on each call.
 * @returns A dispatcher with `track` and `pageview`.
 * @throws {Error} When called outside `ConsentProvider`.
 * @example
 * ```tsx
 * const events = useEventDispatcher({ pageviews: ['posthog'] });
 * const pathname = usePathname();
 * useEffect(() => events.pageview(pathname), [events, pathname]);
 * ```
 */
export const useEventDispatcher = function useEventDispatcher(
	options: RuntimeEventDispatcherOptions = {}
): EventDispatcher {
	const services = useContext(ProviderServicesContext);
	if (!services) {
		throw new Error(
			'c15t: useEventDispatcher() needs <ConsentProvider> from @c15t/react.'
		);
	}
	const { runtime } = services;
	const latest = useCommittedRef(options);
	return useMemo(() => {
		const current = () => getEventDispatcher(runtime, latest.current);
		return {
			pageview: (path) => current().pageview(path),
			track: (event, properties) => current().track(event, properties),
		};
	}, [latest, runtime]);
};

export type { EventDispatcher, EventProperties } from '@c15t/core/events';
export type { RuntimeEventDispatcherOptions as UseEventDispatcherOptions };
