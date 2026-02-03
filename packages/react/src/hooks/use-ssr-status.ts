/**
 * @packageDocumentation
 * Hook for accessing SSR data usage status.
 */

import { useContext } from 'react';
import { ConsentStateContext } from '../context/consent-manager-context';

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
export function useSSRStatus() {
	const context = useContext(ConsentStateContext);

	if (context === undefined) {
		throw new Error(
			'useSSRStatus must be used within a ConsentManagerProvider'
		);
	}

	return {
		/** Whether SSR data was used for initialization */
		ssrDataUsed: context.state.ssrDataUsed,
		/** Reason SSR data was skipped, null if used successfully */
		ssrSkippedReason: context.state.ssrSkippedReason,
	};
}
