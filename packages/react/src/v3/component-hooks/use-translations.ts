'use client';

import type { Translations } from 'c15t';
import { useMemo } from 'react';
import { useTranslations as useKernelTranslations } from '../hooks';
import { defaultTranslationConfig } from '../utils/default-translation-config';

export function useTranslations(): Translations {
	const translations = useKernelTranslations();

	return useMemo(() => {
		return (
			(translations?.translations as Translations | undefined) ??
			(defaultTranslationConfig.translations.en as Translations)
		);
	}, [translations]);
}
