'use client';

import { setupColorScheme } from '@c15t/ui/utils';
import { useEffect } from 'react';

export type ColorScheme = 'light' | 'dark' | 'system' | null;

/**
 * Manage color scheme preferences for components.
 * React wrapper for `@c15t/ui` setupColorScheme.
 */
export function useColorScheme(colorScheme?: ColorScheme) {
	useEffect(() => {
		if (colorScheme === null) return;
		return setupColorScheme(colorScheme as 'light' | 'dark' | 'system');
	}, [colorScheme]);
}
