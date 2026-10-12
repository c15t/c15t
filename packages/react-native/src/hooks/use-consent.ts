/**
 * Read the whole snapshot.
 */

import type { ConsentSnapshot } from '../protocol';
import { useConsentSelector } from './use-consent-selector';

/** Module scope, so the subscription behind {@link useConsent} is stable. */
const selectSnapshot = (snapshot: ConsentSnapshot): ConsentSnapshot => snapshot;

/**
 * The full native snapshot.
 *
 * An escape hatch for a surface that genuinely reads several slices, such as a
 * preference centre. Anything narrower should use {@link useConsentSelector},
 * {@link useIsAllowed}, or {@link useConsentStatus}: this one rerenders on every
 * native change, including changes your screen does not care about.
 *
 * @returns The snapshot the native core holds.
 */
export const useConsent = function useConsent(): ConsentSnapshot {
	return useConsentSelector(selectSnapshot);
};
