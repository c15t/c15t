/**
 * @packageDocumentation
 * Provides the context for sharing consent management state across components.
 */

import type { ConsentManagerInterface, ConsentStoreState } from 'c15t';
import { createContext } from 'preact';

/**
 * The context value provided by ConsentManagerProvider.
 */
export interface ConsentStateContextValue {
	/**
	 * Current consent management state
	 */
	state: ConsentStoreState;

	/**
	 * Reference to the consent manager store instance
	 * We use object type to avoid circular dependencies
	 */
	store: {
		getState: () => ConsentStoreState;
		subscribe: (listener: (state: ConsentStoreState) => void) => () => void;
		setState: (state: Partial<ConsentStoreState>) => void;
	};

	/**
	 * Optional API client instance
	 */
	manager: ConsentManagerInterface | null;
}

/**
 * Context for sharing consent management state across components.
 */
export const ConsentStateContext = createContext<
	ConsentStateContextValue | undefined
>(undefined);
