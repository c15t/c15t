'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to detect if the user prefers reduced motion.
 *
 * @remarks
 * Reads the `prefers-reduced-motion: reduce` media query and updates
 * reactively when the user's preference changes. This is useful for
 * automatically disabling animations for users who have enabled
 * reduced motion in their operating system settings.
 *
 * The hook returns `false` during SSR to avoid hydration mismatches,
 * then updates to the actual preference on the client.
 *
 * @returns `true` if the user prefers reduced motion, `false` otherwise
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const prefersReducedMotion = useReducedMotion();
 *
 *   return (
 *     <motion.div
 *       animate={prefersReducedMotion ? {} : { scale: 1.1 }}
 *     />
 *   );
 * }
 * ```
 *
 * @public
 */
export function useReducedMotion(): boolean {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

	useEffect(() => {
		// Check if we're in a browser environment
		if (typeof window === 'undefined') {
			return;
		}

		const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		setPrefersReducedMotion(mediaQuery.matches);

		const handler = (event: MediaQueryListEvent) => {
			setPrefersReducedMotion(event.matches);
		};

		mediaQuery.addEventListener('change', handler);
		return () => mediaQuery.removeEventListener('change', handler);
	}, []);

	return prefersReducedMotion;
}
