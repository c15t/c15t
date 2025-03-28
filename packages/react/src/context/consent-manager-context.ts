/**
 * @packageDocumentation
 * Provides the context for sharing consent management state across components.
 */

'use client';

import type { PrivacyConsentState, c15tClient } from 'c15t';
import { createContext } from 'react';

/**
 * The context value provided by ConsentManagerProvider.
 */
export interface ConsentStateContextValue {
	/**
	 * Current consent management state
	 */
	state: PrivacyConsentState;

	/**
	 * Reference to the consent manager store instance
	 * We use object type to avoid circular dependencies
	 */
	store: {
		getState: () => PrivacyConsentState;
		subscribe: (listener: (state: PrivacyConsentState) => void) => () => void;
		setState: (state: Partial<PrivacyConsentState>) => void;
	};

	/**
	 * Optional API client instance
	 */
	client: c15tClient | null;
}

/**
 * Context for sharing consent management state across components.
 */
export const ConsentStateContext = createContext<
	ConsentStateContextValue | undefined
>(undefined);
