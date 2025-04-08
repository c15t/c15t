/**
 * @packageDocumentation
 * Hook for accessing the consent manager instance.
 */

import { useContext } from 'react';
import { ConsentStateContext } from '../context/consent-manager-context';

/**
 * Hook for accessing the consent manager API instance.
 *
 * @remarks
 * This hook provides access to the consent manager, allowing components
 * to interact with the consent management API for operations like:
 * - Fetching consent purposes
 * - Updating consent preferences on the server
 * - Retrieving consent history
 *
 * The hook must be used within a ConsentManagerProvider component.
 *
 * @throws {Error}
 * Throws if used outside of a ConsentManagerProvider context or if
 * no manager was initialized.
 *
 * @returns The consent manager instance
 * @public
 */
export function useConsentManager() {
	const context = useContext(ConsentStateContext);

	if (context === undefined) {
		throw new Error(
			'useConsentManager must be used within a ConsentManagerProvider'
		);
	}

	if (context.manager === null) {
		throw new Error(
			'No manager available. Make sure to provide either manager or options to ConsentManagerProvider.'
		);
	}

	return context.manager;
}

// Alias for backward compatibility
export const useConsentClient = useConsentManager;
