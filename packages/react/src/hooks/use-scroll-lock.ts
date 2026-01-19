'use client';

import { setupScrollLock } from '@c15t/ui/utils';
import { useEffect } from 'react';

/**
 * Hook to manage document scroll locking.
 * React wrapper for `@c15t/ui` setupScrollLock.
 */
export function useScrollLock(shouldLock: boolean): void {
	useEffect(() => {
		if (shouldLock) {
			return setupScrollLock();
		}
	}, [shouldLock]);
}
