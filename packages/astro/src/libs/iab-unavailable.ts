/**
 * The error an Astro site throws for an `iab` policy without `iab`.
 *
 * IAB is opt-in. When a visitor's policy uses the `iab` model and the
 * backend sent its vendor list, only a CMP can show the IAB banner, and the
 * site mounts one only when the integration sets `iab`. The standard banner
 * does not handle the model, so the visitor would get no working consent
 * UI. The server render throws this, and so does the browser when it
 * resolves the policy itself.
 *
 * @internal
 */
import { IABUnavailableError, policyNeedsIAB } from '@c15t/core';
import type { ConsentSnapshot } from '@c15t/core';
import { isIABConfigured } from '@c15t/core/runtime';

import type { C15tAstroOptions } from '../types';

/**
 * Whether the site cannot answer for the snapshot's policy.
 *
 * @param snapshot - The kernel snapshot.
 * @param iab - The site's `iab` option.
 * @returns `true` for an `iab` policy with vendor data on a site without
 * `iab`.
 */
export const isIABUnavailable = function isIABUnavailable(
	snapshot: Parameters<typeof policyNeedsIAB>[0],
	iab: C15tAstroOptions['iab']
): boolean {
	return !isIABConfigured(iab) && policyNeedsIAB(snapshot);
};

/**
 * Throw when the site cannot answer for the snapshot's policy.
 *
 * @param snapshot - The kernel snapshot.
 * @param iab - The site's `iab` option.
 * @throws {IABUnavailableError} When {@link isIABUnavailable} holds.
 */
export const assertIABAvailable = function assertIABAvailable(
	snapshot: ConsentSnapshot,
	iab: C15tAstroOptions['iab']
): void {
	if (isIABUnavailable(snapshot, iab)) {
		throw new IABUnavailableError(
			'`iab` is not set',
			'Set `iab` in the c15t() integration options in astro.config'
		);
	}
};
