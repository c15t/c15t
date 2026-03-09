/**
 * @packageDocumentation
 * Hook for accessing and managing consent state.
 */

import type { ConsentManagerInterface, ConsentStoreState } from 'c15t';
import { has as evaluateHas } from 'c15t';
import { useCallback, useContext } from 'react';
import { ConsentStateContext } from '../context/consent-manager-context';

/**
 * Hook for accessing and managing consent state.
 *
 * @remarks
 * This hook provides access to the complete consent management API, including:
 * - Current consent state (what consents are given/required)
 * - Methods to update consents
 * - Compliance settings and region detection
 * - State persistence and retrieval
 * - The consent manager (if configured)
 *
 * The hook must be used within a ConsentManagerProvider component.
 *
 * @throws {Error}
 * Throws if used outside of a ConsentManagerProvider context.
 *
 * @returns Combined state and methods for consent management
 * @public
 */
export function useConsentManager(): ConsentStoreState & {
	manager: ConsentManagerInterface | null;
} {
	const context = useContext(ConsentStateContext);

	if (context === undefined) {
		throw new Error(
			'useConsentManager must be used within a ConsentManagerProvider'
		);
	}

	const {
		consents,
		consentInfo,
		consentCategories,
		consentTypes,
		policyCategories,
		policyScopeMode,
	} = context.state;

	// Override store methods that close over Zustand's `get()` with versions
	// that capture reactive state values from context. Without this, React
	// Compiler sees stable function references + stable arguments and caches
	// the return value forever, producing stale results after consent changes.
	// See: https://github.com/c15t/c15t/issues/604
	const has: ConsentStoreState['has'] = useCallback(
		(condition) =>
			evaluateHas(condition, consents, {
				policyCategories,
				policyScopeMode,
			}),
		[consents, policyCategories, policyScopeMode]
	);

	const hasConsented: ConsentStoreState['hasConsented'] = useCallback(
		() => consentInfo != null,
		[consentInfo]
	);

	const getDisplayedConsents: ConsentStoreState['getDisplayedConsents'] =
		useCallback(
			() =>
				consentTypes.filter((consent) =>
					consentCategories.includes(consent.name)
				),
			[consentTypes, consentCategories]
		);

	return {
		...context.state,
		has,
		hasConsented,
		getDisplayedConsents,
		manager: context.manager,
	};
}
