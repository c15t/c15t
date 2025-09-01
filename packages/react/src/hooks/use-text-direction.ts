'use client';

import { useEffect, useMemo } from 'react';

const RTL_LANGUAGES = [
	'ar', // Arabic
	'he', // Hebrew
	'fa', // Farsi
	'ur', // Urdu
	'ps', // Pashto
	'sd', // Sindhi
	'ku', // Kurdish
	'dv', // Divehi
];

/**
 * Manage text direction based on the language
 * @param language - 'en' | 'ar' ... etc
 */
export function useTextDirection(language?: string) {
	const textDirection = useMemo(() => {
		const normalizedLanguage = language
			? language.split('-')[0]?.toLowerCase()
			: 'en';

		return RTL_LANGUAGES.includes(normalizedLanguage || '') ? 'rtl' : 'ltr';
	}, [language]);

	useEffect(() => {
		if (textDirection === 'rtl') {
			document.body.classList.add('c15t-rtl');
		} else {
			document.body.classList.remove('c15t-rtl');
		}
	}, [textDirection]);

	return textDirection;
}
