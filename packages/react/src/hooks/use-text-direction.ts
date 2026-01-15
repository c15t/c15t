'use client';

import { getTextDirection, setupTextDirection } from '@c15t/ui/utils';
import { useEffect, useMemo } from 'react';

/**
 * Manage text direction based on the language.
 * React wrapper for `@c15t/ui` text direction utilities.
 */
export function useTextDirection(language?: string) {
	const textDirection = useMemo(() => {
		return getTextDirection(language);
	}, [language]);

	useEffect(() => {
		return setupTextDirection(language);
	}, [language]);

	return textDirection;
}
