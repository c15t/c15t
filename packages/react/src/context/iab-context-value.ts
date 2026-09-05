import type { IABHandle } from '@c15t/iab';
import { createContext } from 'react';

/**
 * The IAB slice hooks read: the live CMP handle plus the preference-centre
 * tab, which is UI state rather than consent state.
 *
 * @internal
 */
export interface IABContextValue {
	/** The mounted CMP, or `null` until one is ready. */
	handle: IABHandle | null;
	/** Which preference-centre tab is showing. */
	tab: 'purposes' | 'vendors';
	/** Switch preference-centre tabs. */
	setTab: (tab: 'purposes' | 'vendors') => void;
}

/**
 * Context carrying the IAB CMP handle.
 *
 * It lives in its own module, away from `iab-context.tsx`, because that
 * file statically imports `createIAB` from `@c15t/iab`. A provider handed
 * an externally owned runtime already has a CMP and must be able to publish
 * it here without pulling the TCF encoder into its chunk.
 *
 * @internal
 */
export const IABContext = createContext<IABContextValue | null>(null);
IABContext.displayName = 'C15tIABContext';
