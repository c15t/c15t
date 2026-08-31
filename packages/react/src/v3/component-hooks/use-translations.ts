'use client';

import type { Translations } from '@c15t/core';
import { useMemo } from 'react';

import { useTranslations as useKernelTranslations } from '../hooks';
import { defaultTranslationConfig } from '../utils/default-translation-config';

export const useTranslations = function useTranslations(): Translations {
	const translations = useKernelTranslations();

	return useMemo(
		() =>
			(translations?.translations as Translations | undefined) ??
			(defaultTranslationConfig.translations.en as Translations),
		[translations]
	);
};
