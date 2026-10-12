'use client';

import type {
	ActiveUI,
	ConsentPresentation,
	TranslationConfig,
} from '@c15t/core';
import { useCallback, useMemo } from 'react';

import { useHeadlessConsentUI } from '../component-hooks/use-headless-consent-ui';
import {
	useActiveUI,
	useModel,
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

export const useIABConsentManager = function useIABConsentManager(
	overrides?: ConsentPresentation
) {
	const activeUI = useActiveUI();
	const model = useModel();
	const { banner: policyBanner, dialog: policyDialog } =
		useHeadlessConsentUI(overrides);
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
		model,
		policyBanner,
		policyDialog,
		setActiveUI,
		translationConfig,
	};
};
