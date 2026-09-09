'use client';

import type { ActiveUI, Model, TranslationConfig } from '@c15t/core';
import { useCallback, useMemo } from 'react';

import {
	useActiveUI,
	useModel,
	usePromptPresentation,
	usePreferencesPresentation,
	useSetActiveUI,
	useTranslations,
} from '../hooks';
import { useIAB } from '../iab-context';
import { defaultTranslationConfig } from '../utils/default-translation-config';

const toTranslationConfig = function toTranslationConfig(
	resolved: ReturnType<typeof useTranslations>
): TranslationConfig {
	if (!resolved) {
		return defaultTranslationConfig;
	}

	return {
		...defaultTranslationConfig,
		defaultLanguage: resolved.language,
		translations: {
			...defaultTranslationConfig.translations,
			[resolved.language]: resolved.translations,
		},
	};
};

export const useIABConsentManager = function useIABConsentManager() {
	const activeUI = useActiveUI();
	const model = useModel();
	const policyBanner = usePromptPresentation();
	const policyDialog = usePreferencesPresentation();
	const setKernelActiveUI = useSetActiveUI();
	const translations = useTranslations();
	const iab = useIAB();
	const translationConfig = useMemo(
		() => toTranslationConfig(translations),
		[translations]
	);
	const setActiveUI = useCallback(
		(ui: ActiveUI, _options?: { force?: boolean }) => {
			setKernelActiveUI(ui);
		},
		[setKernelActiveUI]
	);

	return {
		activeUI: (activeUI ?? 'none') as ActiveUI,
		iab,
		model: (model ?? 'opt-in') as Model,
		policyBanner: policyBanner ?? {},
		policyDialog: policyDialog ?? {},
		setActiveUI,
		translationConfig,
	};
};
