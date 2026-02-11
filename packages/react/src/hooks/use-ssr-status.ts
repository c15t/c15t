/**
 * @packageDocumentation
 * Hook for accessing SSR data usage status.
 */

import { useContext } from 'react';
import { ConsentStateContext } from '../context/consent-manager-context';

/**
 * Return value of {@link useSSRStatus}.
 *
 * @public
 */
export interface SSRStatus {
	/**
	 * Whether SSR data was used for initialization.
	 *
	 * `true` if SSR data was provided and successfully consumed,
	 * `false` otherwise.
	 */
	ssrDataUsed: boolean;

	/**
	 * Reason SSR data was skipped, or `null` if used successfully.
	 *
	 * - `'no_data'` — no `ssrData` prop was provided to the provider
	 * - `'fetch_failed'` — `ssrData` was provided but the Promise resolved with no data
	 */
	ssrSkippedReason: 'no_data' | 'fetch_failed' | null;
}

/**
 * Returns information about SSR data usage.
 *
 * @remarks
 * This hook is useful for debugging whether server-side data was used
 * for consent manager initialization. It can help identify issues with
 * SSR data fetching or hydration.
 *
 * The hook must be used within a ConsentManagerProvider component.
 *
 * @throws {Error}
 * Throws if used outside of a ConsentManagerProvider context.
 *
 * @returns Object containing SSR status information
 *
 * @example
 * ```tsx
 * function DebugInfo() {
 *   const { ssrDataUsed, ssrSkippedReason } = useSSRStatus();
 *
 *   if (ssrDataUsed) {
 *     return <span>SSR data was used</span>;
 *   }
 *
 *   return <span>SSR skipped: {ssrSkippedReason}</span>;
 * }
 * ```
 *
 * @public
 */
export function useSSRStatus(): SSRStatus {
	const context = useContext(ConsentStateContext);

	if (context === undefined) {
		throw new Error(
			'useSSRStatus must be used within a ConsentManagerProvider'
		);
	}

	return {
		ssrDataUsed: context.state.ssrDataUsed,
		ssrSkippedReason: context.state.ssrSkippedReason,
	};
}
