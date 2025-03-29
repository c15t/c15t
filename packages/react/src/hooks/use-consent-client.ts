/**
 * @packageDocumentation
 * Hook for accessing the c15t API client instance.
 */

import { useContext } from 'react';
import { ConsentStateContext } from '../context/consent-manager-context';

/**
 * Hook for accessing the c15t API client instance.
 *
 * @remarks
 * This hook provides access to the c15t API client, allowing components
 * to interact with the consent management API for operations like:
 * - Fetching consent purposes
 * - Updating consent preferences on the server
 * - Retrieving consent history
 *
 * The hook must be used within a ConsentManagerProvider component
 * that has been initialized with clientOptions.
 *
 * @throws {Error}
 * Throws if used outside of a ConsentManagerProvider context or if
 * no client was initialized (missing clientOptions).
 *
 * @returns The c15t API client instance
 * @public
 */
export function useConsentClient() {
	const context = useContext(ConsentStateContext);

	if (context === undefined) {
		throw new Error(
			'useConsentClient must be used within a ConsentManagerProvider'
		);
	}

	if (context.client === null) {
		throw new Error(
			'No API client available. Make sure to provide clientOptions to ConsentManagerProvider.'
		);
	}

	return context.client;
}
