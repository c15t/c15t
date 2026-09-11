import { OPTIONAL_CONSENT_CATEGORIES } from '../../consent-record/types';
import type { OptionalConsentCategory } from '../../consent-record/types';
import {
	PENDING_SAVES_STORAGE_KEY,
	STORAGE_KEY,
	STORAGE_KEY_V2,
} from '../../libs/storage-keys';
import { getEffectiveGateState } from '../has';
import { clearTargets } from './targets';
import type {
	ClearOnRevocationHandle,
	ClearOnRevocationOptions,
} from './types';

export type {
	ClearOnRevocationConfig,
	ClearOnRevocationCookie,
	ClearOnRevocationHandle,
	ClearOnRevocationOptions,
	ClearOnRevocationTargets,
} from './types';

/**
 * Remove configured browser data for denied optional consent categories.
 * Waits for policy resolution, then clears once on attachment and whenever
 * a granted category becomes denied. Draft edits do not trigger cleanup.
 * Browser storage failures are ignored so consent changes can still complete.
 *
 * @param options - Kernel, category targets, and persistence configuration.
 * @returns A subscription handle. Disposing does not clear data.
 * @example
 * ```ts
 * const cleanup = createClearOnRevocation({
 *   kernel,
 *   config: { measurement: { cookies: ['_ga', '_ga_*'] } },
 * });
 * ```
 */
export const createClearOnRevocation = (
	options: ClearOnRevocationOptions
): ClearOnRevocationHandle => {
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return {
			dispose() {
				// No browser subscription was installed.
			},
		};
	}
	const { kernel, config, storageConfig } = options;
	const protectedKeys = new Set([STORAGE_KEY, PENDING_SAVES_STORAGE_KEY]);
	for (const key of [
		STORAGE_KEY_V2,
		storageConfig?.storageKey || STORAGE_KEY_V2,
	]) {
		protectedKeys.add(key);
		protectedKeys.add(`${key}-notice`);
		protectedKeys.add(`${key}-privacy`);
	}
	const previous = new Map<OptionalConsentCategory, boolean>();
	const reconcile = (): void => {
		const snapshot = kernel.getSnapshot();
		// Provisional opt-in fallback can deny a valid hydrated choice while
		// the actual policy is still loading. Deletion cannot be undone.
		if (snapshot.policyPending) {
			return;
		}
		const { effectivePermissions } = getEffectiveGateState(snapshot);
		for (const category of OPTIONAL_CONSENT_CATEGORIES) {
			const targets = config[category];
			if (!targets) {
				continue;
			}
			const granted = effectivePermissions[category] === true;
			const wasGranted = previous.get(category);
			previous.set(category, granted);
			if (!granted && wasGranted !== false) {
				clearTargets(targets, protectedKeys);
			}
		}
	};
	const unsubscribe = kernel.subscribe(reconcile);
	reconcile();
	return { dispose: unsubscribe };
};
