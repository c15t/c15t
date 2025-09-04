/**
 * @packageDocumentation
 * Provides a reusable hook for managing document scroll locking.
 */

import { useEffect, useLayoutEffect } from 'preact/compat';

// Use layout effect on the client, effect on the server
const useIsomorphicLayoutEffect =
	typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Keep a simple ref count so multiple lock callers can coexist
let lockCount = 0;
let originalOverflow = '';
let originalPaddingRight = '';

/**
 * Lock or unlock document scrolling.
 *
 * - Handles nested locks by reference counting
 * - Prevents layout shift by compensating for scrollbar width
 * - Restores original styles on final unlock
 */
export function useScrollLock(shouldLock: boolean): void {
	useIsomorphicLayoutEffect(() => {
		if (typeof document === 'undefined') return;

		if (shouldLock) {
			lockCount += 1;

			// Apply lock only on first requester
			if (lockCount === 1) {
				originalOverflow = document.body.style.overflow;
				originalPaddingRight = document.body.style.paddingRight;

				const scrollbarWidth =
					window.innerWidth - document.documentElement.clientWidth;

				document.body.style.overflow = 'hidden';
				if (scrollbarWidth > 0) {
					document.body.style.paddingRight = `${scrollbarWidth}px`;
				}
			}

			// Cleanup: release one lock
			return () => {
				lockCount = Math.max(0, lockCount - 1);
				if (lockCount === 0) {
					document.body.style.overflow = originalOverflow;
					document.body.style.paddingRight = originalPaddingRight;
				}
			};
		}

		// If not locking, no action needed
		return;
	}, [shouldLock]);
}
