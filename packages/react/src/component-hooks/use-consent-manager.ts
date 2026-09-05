'use client';

import type {
	ActiveUI,
	AllConsentNames,
	ConsentState,
	ConsentType,
	HasCondition,
	KernelActiveUI,
	Model,
	PolicyUiSurfaceConfig,
	TranslationConfig,
} from '@c15t/core';
import { useCallback, useMemo } from 'react';

import { useConsentDraft } from '../draft';
import {
	useActiveUI,
	useBranding,
	useConsents,
	useModel,
	usePromptPresentation,
	usePolicyCategories,
	usePreferencesPresentation,
	usePolicyScopeMode,
	useSaveConsents,
	useSetActiveUI,
	useSnapshot,
	useSubscribeToConsentChanges,
	useTranslations,
} from '../hooks';
import { defaultTranslationConfig } from '../utils/default-translation-config';

type SaveType = 'all' | 'custom' | 'necessary';

const EMPTY_POLICY_SURFACE: PolicyUiSurfaceConfig = {};
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

const evaluateHas = function evaluateHas(
	condition: HasCondition<AllConsentNames>,
	consents: ConsentState,
	options: {
		policyCategories: AllConsentNames[] | null;
		policyScopeMode: 'strict' | 'permissive';
	}
): boolean {
	if (typeof condition !== 'string') {
		if ('and' in condition) {
			const entries = Array.isArray(condition.and)
				? condition.and
				: [condition.and];
			return entries.every((entry: HasCondition<AllConsentNames>) =>
				evaluateHas(entry, consents, options)
			);
		}
		if ('or' in condition) {
			const entries = Array.isArray(condition.or)
				? condition.or
				: [condition.or];
			return entries.some((entry: HasCondition<AllConsentNames>) =>
				evaluateHas(entry, consents, options)
			);
		}
		if ('not' in condition) {
			return !evaluateHas(condition.not, consents, options);
		}
		return false;
	}

	const category = condition as AllConsentNames;
	const allowed = options.policyCategories;
	if (allowed && options.policyScopeMode === 'strict') {
		return allowed.includes(category) && Boolean(consents[category]);
	}
	return Boolean(consents[category]);
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
	const saveKernelConsents = useSaveConsents();
	const setKernelActiveUI = useSetActiveUI();
	const subscribeToKernelConsentChanges = useSubscribeToConsentChanges();
	const translations = useTranslations();
	const draft = useConsentDraft();

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
			evaluateHas(condition, consents as ConsentState, {
				policyCategories: policyCategories.length > 0 ? policyCategories : null,
				policyScopeMode,
			}),
		[consents, policyScopeMode, policyCategories]
	);

	const setActiveUI = useCallback(
		(ui: ActiveUI) => {
			setKernelActiveUI(ui as KernelActiveUI);
		},
		[setKernelActiveUI]
	);

	const saveConsents = useCallback(
		async (type: SaveType, _options?: { uiSource?: string }) => {
			if (type === 'all') {
				await saveKernelConsents('all');
				draft.reset();
				return;
			}
			if (type === 'necessary') {
				await saveKernelConsents('none');
				draft.reset();
				return;
			}
			await draft.save();
		},
		[draft, saveKernelConsents]
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
