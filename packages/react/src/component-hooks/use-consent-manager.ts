'use client';

import type {
	ActiveUI,
	AllConsentNames,
	ConsentState,
	ConsentType,
	HasCondition,
	KernelActiveUI,
	Model,
	PromptPresentation,
	TranslationConfig,
} from '@c15t/core';
import { evaluateConsent } from '@c15t/core';
import { useCallback, useMemo } from 'react';

import { useConsentManagerDraft } from '../draft';
import {
	useActiveUI,
	useBranding,
	useConsents,
	useModel,
	usePromptPresentation,
	usePolicyCategories,
	usePreferencesPresentation,
	usePolicyScopeMode,
	useSetActiveUI,
	useSnapshot,
	useSubscribeToConsentChanges,
	useTranslations,
} from '../hooks';
import { defaultTranslationConfig } from '../utils/default-translation-config';

type SaveType = 'all' | 'custom' | 'necessary';

const EMPTY_POLICY_SURFACE: PromptPresentation = {};
const DEFAULT_CONSENT_TYPES: ConsentType[] = [
	{
		defaultValue: true,
		description: 'Required for basic site functionality',
		disabled: true,
		display: true,
		gdprType: 1,
		name: 'necessary',
	},
	{
		defaultValue: false,
		description: 'Enables enhanced features',
		display: true,
		gdprType: 2,
		name: 'functionality',
	},
	{
		defaultValue: false,
		description: 'Analytics and performance measurement',
		display: true,
		gdprType: 4,
		name: 'measurement',
	},
	{
		defaultValue: false,
		description: 'Improves your experience',
		display: true,
		gdprType: 3,
		name: 'experience',
	},
	{
		defaultValue: false,
		description: 'Advertising and marketing',
		display: true,
		gdprType: 5,
		name: 'marketing',
	},
];

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

const toActiveUI = function toActiveUI(ui: KernelActiveUI): ActiveUI {
	return (ui ?? 'none') as ActiveUI;
};

export const useConsentManager = function useConsentManager() {
	const snapshot = useSnapshot();
	const consents = useConsents();
	const activeUI = useActiveUI();
	const branding = useBranding();
	const model = useModel();
	const policyBanner = usePromptPresentation();
	const policyCategoriesSnapshot = usePolicyCategories();
	const policyDialog = usePreferencesPresentation();
	const policyScopeMode = usePolicyScopeMode();
	const { draft, save: saveKernelConsents } = useConsentManagerDraft();
	const setKernelActiveUI = useSetActiveUI();
	const subscribeToKernelConsentChanges = useSubscribeToConsentChanges();
	const translations = useTranslations();

	const translationConfig = useMemo(
		() => toTranslationConfig(translations),
		[translations]
	);

	const policyCategories = useMemo(
		() => ['necessary', ...policyCategoriesSnapshot] as AllConsentNames[],
		[policyCategoriesSnapshot]
	);
	const consentCategories = useMemo<AllConsentNames[]>(
		() =>
			policyCategories.length > 0
				? (policyCategories as AllConsentNames[])
				: DEFAULT_CONSENT_TYPES.map((type) => type.name),
		[policyCategories]
	);

	const getDisplayedConsents = useCallback((): ConsentType[] => {
		const allowed = new Set(consentCategories);
		return DEFAULT_CONSENT_TYPES.filter((type) => allowed.has(type.name)).map(
			(type) => ({ ...type, display: true })
		);
	}, [consentCategories]);

	const has = useCallback(
		(condition: HasCondition<AllConsentNames>) =>
			evaluateConsent({ category: condition }, snapshot),
		[snapshot]
	);

	const setActiveUI = useCallback(
		(ui: ActiveUI) => {
			setKernelActiveUI(ui as KernelActiveUI);
		},
		[setKernelActiveUI]
	);

	const saveConsents = useCallback(
		async (type: SaveType, _options?: { uiSource?: string }) => {
			if (type === 'custom') {
				await saveKernelConsents();
				return;
			}
			await saveKernelConsents(type === 'all' ? 'all' : 'none');
		},
		[saveKernelConsents]
	);

	const setSelectedConsent = useCallback(
		(name: AllConsentNames, value: boolean) => {
			draft.set(name, value);
		},
		[draft]
	);

	const updateConsentCategories = useCallback((_names: AllConsentNames[]) => {
		// v3 policy categories come from the kernel. Frame registration is no-op.
	}, []);

	const subscribeToConsentChanges = useCallback(
		(listener: (state: ConsentState) => void) =>
			subscribeToKernelConsentChanges(listener),
		[subscribeToKernelConsentChanges]
	);

	return {
		activeUI: toActiveUI(activeUI),
		branding: branding ?? 'c15t',
		consentCategories,
		consentTypes: getDisplayedConsents(),
		consents: consents as ConsentState,
		draftIsStale: draft.isStale,
		effectivePermissions: snapshot.effectivePermissions,
		explicitChoice: snapshot.explicitChoice,
		getDisplayedConsents,
		has,
		iab: snapshot.iab,
		manager: null,
		model: (model ?? 'opt-in') as Model,
		noticeDismissal: snapshot.noticeDismissal,
		optOutDirectives: snapshot.optOutDirectives,
		policyBanner: policyBanner ?? EMPTY_POLICY_SURFACE,
		policyCategories,
		policyDialog: policyDialog ?? EMPTY_POLICY_SURFACE,
		policyRule: snapshot.policyRule,
		policyScopeMode,
		privacySignals: snapshot.privacySignals,
		promptRequirement: snapshot.promptRequirement,
		resetDraft: draft.reset,
		resolution: snapshot.resolution,
		restrictions: snapshot.restrictions,
		saveConsents,
		selectedConsentTypes: draft.values,
		selectedConsents: draft.values,
		setActiveUI,
		setSelectedConsent,
		subscribeToConsentChanges,
		translationConfig,
		updateConsentCategories,
	};
};
