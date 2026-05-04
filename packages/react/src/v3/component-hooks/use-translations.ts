'use client';

import type { Translations } from 'c15t';
import { defaultTranslationConfig } from 'c15t';
import { useMemo } from 'react';
import { useTranslations as useKernelTranslations } from '../hooks';

export function useTranslations(): Translations {
	const translations = useKernelTranslations();

	return useMemo(() => {
		return (
			(translations?.translations as Translations | undefined) ??
			(defaultTranslationConfig.translations.en as Translations)
		);
	}, [translations]);
}
