'use client';

import { setupFocusTrap } from '@c15t/ui/utils';
import { type RefObject, useEffect } from 'react';

/**
 * Hook that manages focus trapping within a container.
 *
 * @remarks
 * This hook ensures keyboard navigation stays within the container
 * while it's active, improving accessibility for modal dialogs.
 *
 * @param shouldTrap - Boolean indicating whether focus should be trapped
 * @param containerRef - Reference to the container element
 *
 * @public
 */
export function useFocusTrap(
	shouldTrap: boolean,
	containerRef: RefObject<HTMLElement | null> | null
): void {
	useEffect(() => {
		if (!shouldTrap || !containerRef || !containerRef.current) {
			return;
		}

		return setupFocusTrap(containerRef.current);
	}, [shouldTrap, containerRef]);
}
