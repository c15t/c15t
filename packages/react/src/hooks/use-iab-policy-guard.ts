import { IABUnavailableError, policyNeedsIAB } from '@c15t/core';
import { useContext } from 'react';

import { IABContext } from '~/context/iab-context-value';
import { useKernelSelector } from '~/kernel-selector';

/**
 * Marks that `@c15t/react/iab` has loaded. A registry symbol, so a copy of
 * this module in another chunk reads the same mark.
 */
const IAB_PROVIDER_LOADED = Symbol.for('c15t.react.iab-provider');

/**
 * Record that `IABProvider` is part of the app. `@c15t/react/iab` calls
 * this when it loads.
 *
 * @internal
 */
export const markIABProviderLoaded = function markIABProviderLoaded(): void {
	(globalThis as Record<symbol, unknown>)[IAB_PROVIDER_LOADED] = true;
};

/**
 * The error the standard surfaces throw for an `iab` policy without
 * `<IABProvider>`.
 *
 * @returns A fresh {@link IABUnavailableError}.
 * @internal
 */
export const missingIABProviderError =
	function missingIABProviderError(): IABUnavailableError {
		return new IABUnavailableError(
			'no <IABProvider> is mounted',
			"Wrap your IAB consent UI in <IABProvider> from '@c15t/react/iab' (or 'c15t/react/iab')"
		);
	};

/**
 * Throw while rendering when the visitor's policy needs a CMP and the app
 * has none.
 *
 * The standard banner and dialog do not answer for the IAB model, so
 * without `<IABProvider>` a visitor under an `iab` policy would see no
 * consent UI at all. Throwing during render reaches error boundaries and
 * framework error overlays, on the server render and in the browser alike,
 * since both read the same snapshot.
 *
 * `<IABProvider>` usually sits beside the standard surfaces rather than
 * around them, so a missing IAB context alone does not prove the app has
 * none. The check also passes once `@c15t/react/iab` has loaded.
 *
 * @throws {IABUnavailableError} When the policy needs IAB and neither an
 * IAB context nor `@c15t/react/iab` is present.
 * @internal
 */
export const useIABPolicyGuard = function useIABPolicyGuard(): void {
	const iab = useContext(IABContext);
	const needsIAB = useKernelSelector(policyNeedsIAB);
	if (
		needsIAB &&
		iab === null &&
		(globalThis as Record<symbol, unknown>)[IAB_PROVIDER_LOADED] !== true
	) {
		throw missingIABProviderError();
	}
};
