'use client';

import {
	type ActiveUI,
	type AllConsentNames,
	type ConsentType,
	consentTypes as defaultConsentTypes,
	defaultTranslationConfig,
	has as evaluateHas,
	type Model,
	type TranslationConfig,
} from 'c15t';
import type {
	ConsentState,
	KernelActiveUI,
	PolicyUiSurfaceConfig,
} from 'c15t/v3';
import { useCallback, useMemo } from 'react';
import { useConsentDraft } from '../draft';
import {
	useActiveUI,
	useBranding,
	useConsents,
	useHasConsented,
	useModel,
	usePolicyBanner,
	usePolicyCategories,
	usePolicyDialog,
	usePolicyScopeMode,
	useSaveConsents,
	useSetActiveUI,
	useSetConsent,
	useSnapshot,
	useSubscribeToConsentChanges,
	useTranslations,
} from '../hooks';
import { useIAB } from '../iab-context';

type SaveType = 'all' | 'custom' | 'necessary';

const EMPTY_POLICY_SURFACE: PolicyUiSurfaceConfig = {};

function toTranslationConfig(
	resolved: ReturnType<typeof useTranslations>
): TranslationConfig {
	if (!resolved) return defaultTranslationConfig;

	return {
		...defaultTranslationConfig,
		defaultLanguage: resolved.language,
		translations: {
			...defaultTranslationConfig.translations,
			[resolved.language]: resolved.translations,
		},
	};
}

function toActiveUI(ui: KernelActiveUI): ActiveUI {
	return (ui ?? 'none') as ActiveUI;
}

export function useConsentManager() {
	const snapshot = useSnapshot();
	const consents = useConsents();
	const activeUI = useActiveUI();
	const branding = useBranding();
	const hasConsentedValue = useHasConsented();
	const model = useModel();
	const policyBanner = usePolicyBanner();
	const policyCategoriesSnapshot = usePolicyCategories();
	const policyDialog = usePolicyDialog();
	const policyScopeMode = usePolicyScopeMode();
	const saveKernelConsents = useSaveConsents();
	const setKernelActiveUI = useSetActiveUI();
	const setKernelConsent = useSetConsent();
	const subscribeToKernelConsentChanges = useSubscribeToConsentChanges();
	const translations = useTranslations();
	const draft = useConsentDraft();
	const iab = useIAB();
	const translationConfig = useMemo(
		() => toTranslationConfig(translations),
		[translations]
	);

	const policyCategories = useMemo(
		() => Array.from(policyCategoriesSnapshot),
		[policyCategoriesSnapshot]
	);
	const consentCategories = useMemo<AllConsentNames[]>(() => {
		return policyCategories.length > 0
			? (policyCategories as AllConsentNames[])
			: defaultConsentTypes.map((type) => type.name);
	}, [policyCategories]);

	const getDisplayedConsents = useCallback((): ConsentType[] => {
		const allowed = new Set(consentCategories);
		return defaultConsentTypes
			.filter((type) => allowed.has(type.name))
			.map((type) => ({ ...type, display: true }));
	}, [consentCategories]);

	const has = useCallback(
		(condition: Parameters<typeof evaluateHas>[0]) =>
			evaluateHas(condition, consents as ConsentState, {
				policyCategories: policyCategories.length > 0 ? policyCategories : null,
				policyScopeMode,
			}),
		[consents, policyScopeMode, policyCategories]
	);

	const hasConsented = useCallback(
		() => hasConsentedValue,
		[hasConsentedValue]
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

	const setConsent = useCallback(
		(name: AllConsentNames, value: boolean) => {
			setKernelConsent({ [name]: value } as Partial<ConsentState>);
		},
		[setKernelConsent]
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
		...snapshot,
		activeUI: toActiveUI(activeUI),
		branding: branding ?? 'c15t',
		consents: consents as ConsentState,
		selectedConsents: draft.values,
		consentInfo: hasConsentedValue ? { type: 'v3' } : null,
		consentCategories,
		consentTypes: getDisplayedConsents(),
		getDisplayedConsents,
		has,
		hasConsented,
		iab,
		manager: null,
		model: (model ?? 'opt-in') as Model,
		policyBanner: policyBanner ?? EMPTY_POLICY_SURFACE,
		policyCategories,
		policyDialog: policyDialog ?? EMPTY_POLICY_SURFACE,
		policyScopeMode,
		saveConsents,
		selectedConsentTypes: draft.values,
		setActiveUI,
		setConsent,
		setSelectedConsent,
		subscribeToConsentChanges,
		translationConfig,
		updateConsentCategories,
	};
}
