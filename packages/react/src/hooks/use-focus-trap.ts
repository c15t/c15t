'use client';

import { setupFocusTrap } from '@c15t/ui/utils/dom';
import type { FocusTrapOptions } from '@c15t/ui/utils/dom';
import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Hook that manages focus trapping within a container.
 *
 * @remarks
 * This hook ensures keyboard navigation stays within the container
 * while it's active, improving accessibility for modal dialogs.
 *
 * @param shouldTrap - Boolean indicating whether focus should be trapped
 * @param containerRef - Reference to the container element
 * @param options - Where the trap puts focus when it starts
 *
 * @public
 */
export const useFocusTrap = function useFocusTrap(
	shouldTrap: boolean,
	containerRef: RefObject<HTMLElement | null> | null,
	options?: FocusTrapOptions
): void {
	const initialFocus = options?.initialFocus;
	useEffect(() => {
		if (!shouldTrap || !containerRef || !containerRef.current) {
			return;
		}

		return setupFocusTrap(containerRef.current, { initialFocus });
	}, [shouldTrap, containerRef, initialFocus]);
};
