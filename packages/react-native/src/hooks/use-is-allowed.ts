/**
 * Gate one category.
 */

import { useCallback } from 'react';

import { isCategoryAllowed } from '../lib/selectors';
import type { ConsentSnapshot } from '../protocol';
import type { AllConsentNames } from '../protocol/vocabulary';
import { useConsentSelector } from './use-consent-selector';

/**
 * Whether one category may run right now.
 *
 * The value is a boolean, so the subscriber rerenders on the flip and nothing
 * else: a policy re-resolution that leaves the permission alone costs nothing.
 *
 * @example
 * ```tsx
 * function Attribution() {
 *     const allowed = useIsAllowed('measurement');
 *
 *     return allowed ? <VendorInit /> : null;
 * }
 * ```
 *
 * @param category - Category to gate. `necessary` is always allowed.
 * @returns `true` when the category is allowed, `false` while hydration or the
 *   first policy resolution is still outstanding.
 */
export const useIsAllowed = function useIsAllowed(
	category: AllConsentNames
): boolean {
	// Memoized per category so the subscription survives an unrelated rerender.
	const selectCategory = useCallback(
		(snapshot: ConsentSnapshot): boolean =>
			isCategoryAllowed(snapshot, category),
		[category]
	);

	return useConsentSelector(selectCategory);
};
