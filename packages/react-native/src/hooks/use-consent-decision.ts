/**
 * Gate one category on why it is closed, not just on whether.
 */

import { useCallback } from 'react';

import type { ConsentDecision } from '../lib/selectors';
import { categoryDecision } from '../lib/selectors';
import type { ConsentSnapshot } from '../protocol';
import type { AllConsentNames } from '../protocol/vocabulary';
import { useConsentSelector } from './use-consent-selector';

/**
 * Why one category may or may not run.
 *
 * The value is one of three strings, so a subscriber rerenders when the answer
 * changes and not when a policy re-resolves underneath it. Reach for
 * {@link useIsAllowed} instead when the only question is "may I run", and for this
 * when you have to hold off rather than give up: an SDK that starts on `pending` is
 * initializing on an unknown, and an SDK that stays off after a policy resolves has
 * switched off a category that was about to be granted.
 *
 * `pending` is not a promise that an answer is coming. A first launch with no
 * network stays `pending` for the life of the process, which is the safe answer. A
 * host that cannot wait that long bounds the wait itself, because any timeout this
 * package picked would become a legally loadable answer the policy never gave.
 *
 * @example
 * ```tsx
 * function Attribution() {
 *     const decision = useConsentDecision('measurement');
 *
 *     useEffect(() => {
 *         if (decision === 'granted') measurementSdk.init();
 *     }, [decision]);
 *
 *     return null;
 * }
 * ```
 *
 * @param category - Category to gate. `necessary` is always `granted`.
 * @returns `granted`, `denied`, or `pending` while hydration or the first policy
 *   resolution is still outstanding.
 */
export const useConsentDecision = function useConsentDecision(
	category: AllConsentNames
): ConsentDecision {
	// Memoized per category so the subscription survives an unrelated rerender.
	const selectCategory = useCallback(
		(snapshot: ConsentSnapshot): ConsentDecision =>
			categoryDecision(snapshot, category),
		[category]
	);

	return useConsentSelector(selectCategory);
};
