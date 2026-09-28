/**
 * Gate one category on consent and on the platform together.
 */

import { useCallback, useSyncExternalStore } from 'react';

import type { AllConsentNames } from '../protocol/vocabulary';
import { useConsentClient } from '../provider/consent-context';

/**
 * Whether tracking behaviour may run for one category.
 *
 * Two answers have to agree, and this hook reads both: the c15t decision for
 * `category`, and the platform's tracking authorization. This is what an
 * analytics or ad SDK gates on, because either half alone is wrong in a
 * different direction. Consent granted on a device where Apple says no is still
 * off, and ATT authorized on a category the subject refused is still off. Consent
 * that has not resolved stays off while it resolves, whichever way the platform
 * answer went.
 *
 * `necessary` returns `true`. It is not a tracking behaviour, so the platform
 * gate has nothing to say about it.
 *
 * The component rerenders when either answer moves, and not when a policy
 * re-resolves without moving the one it reads.
 *
 * @example
 * ```tsx
 * function Attribution() {
 *     const allowed = useIsTrackingAllowed('marketing');
 *
 *     useEffect(() => {
 *         if (allowed) adSdk.enableIdfa();
 *     }, [allowed]);
 *
 *     return null;
 * }
 * ```
 *
 * @param category - Category the caller wants to run.
 * @returns `true` only when consent is granted and the platform is satisfied.
 */
export const useIsTrackingAllowed = function useIsTrackingAllowed(
	category: AllConsentNames
): boolean {
	const client = useConsentClient();

	// Reads the whole rule rather than one half of it, so the hook and
	// `ConsentClient.isTrackingAllowed` cannot drift into two different answers.
	const read = useCallback(
		() => client.isTrackingAllowed(category),
		[category, client]
	);

	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			// Two sources, one boolean: the consent half arrives as a snapshot event
			// and the platform half only when a request resolves.
			const stopSnapshot = client.subscribe(read, onStoreChange);
			const stopTracking = client.subscribeTracking(onStoreChange);

			return () => {
				stopSnapshot();
				stopTracking();
			};
		},
		[client, read]
	);

	return useSyncExternalStore(subscribe, read, read);
};
