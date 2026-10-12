/**
 * Data clearing, written against {@link ClearOnRevocationTools} so it
 * imports nothing the first-load graph has and can load on demand as one
 * chunk. `index.ts` is the public entry.
 */
import type { OptionalConsentCategory } from '../../consent-record/types';
import { clearTargets } from './targets';
import type {
	ClearOnRevocationHandle,
	ClearOnRevocationOptions,
	ClearOnRevocationTools,
} from './types';

/**
 * Remove configured browser data for denied optional consent categories.
 * Waits for policy resolution, then clears once on attachment and whenever
 * a granted category becomes denied. Draft edits do not trigger cleanup.
 * Browser storage failures are ignored so consent changes can still complete.
 *
 * @param options - Kernel, category targets, and persistence configuration.
 * @param tools - Consent evaluation and c15t's storage keys.
 * @returns A subscription handle. Disposing does not clear data.
 * @internal
 */
export const createClearOnRevocationWith = (
	options: ClearOnRevocationOptions,
	tools: ClearOnRevocationTools
): ClearOnRevocationHandle => {
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return {
			dispose() {
				// No browser subscription was installed.
			},
		};
	}
	const { kernel, config, storageConfig } = options;
	const { gateState, storageKey } = tools;
	const protectedKeys = new Set([
		...tools.protectedStorageKeys,
		// Keep the optional IAB addon's receipts without importing its runtime.
		'c15t-iab-authority-v1',
		'euconsent-v2',
	]);
	for (const key of [storageKey, storageConfig?.storageKey || storageKey]) {
		protectedKeys.add(key);
		protectedKeys.add(`${key}-notice`);
		protectedKeys.add(`${key}-privacy`);
		protectedKeys.add(`${key}-vendors`);
		protectedKeys.add(`${key}-epoch`);
		protectedKeys.add(`${key}-cookie-miss`);
	}
	const previous = new Map<OptionalConsentCategory, boolean>();
	const reconcile = (): void => {
		const snapshot = kernel.getSnapshot();
		// Provisional opt-in fallback can deny a valid hydrated choice while
		// the actual policy is still loading. Deletion cannot be undone.
		if (snapshot.policyPending) {
			return;
		}
		const { effectivePermissions } = gateState(snapshot);
		for (const category of tools.optionalConsentCategories) {
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
