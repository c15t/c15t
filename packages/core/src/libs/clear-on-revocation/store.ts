/**
 * @packageDocumentation
 * Store integration for clearing first-party cookies and Web Storage keys
 * when consent categories are not granted.
 */

import type { ConsentStoreState } from '../../store/type';
import type { AllConsentNames } from '../../types/consent-types';
import { runClearOnRevocation } from './core';

type GetState = () => ConsentStoreState;
type SetState = (partial: Partial<ConsentStoreState>) => void;

function getDeniedCategories(state: ConsentStoreState): AllConsentNames[] {
	return state.consentCategories.filter(
		(category) => !state.consents[category]
	);
}

/**
 * Wires clear-on-revocation into the store.
 *
 * sweepClearOnRevocation always re-reads denied categories from current
 * state instead of diffing against a previous snapshot - same pattern as
 * the network blocker and script loader. That's what lets it catch
 * categories that were denied before `clearOnRevocation` was even
 * configured (a returning visitor), not just ones revoked this session.
 *
 * @internal
 */
export function createClearOnRevocationManager(get: GetState, set: SetState) {
	return {
		// Clears whatever's configured for every category that's currently denied.
		sweepClearOnRevocation: (): void => {
			const state = get();

			runClearOnRevocation(state.clearOnRevocation, getDeniedCategories(state));
		},

		// Swaps in a new config and sweeps right away, so already-denied
		// categories get cleared instead of waiting for the next revocation.
		setClearOnRevocation: (
			config: ConsentStoreState['clearOnRevocation']
		): void => {
			set({ clearOnRevocation: config });

			const state = get();

			runClearOnRevocation(config, getDeniedCategories(state));
		},
	};
}
