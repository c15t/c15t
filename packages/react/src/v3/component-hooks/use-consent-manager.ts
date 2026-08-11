'use client';

import {
	type ActiveUI,
	type AllConsentNames,
	type ConsentType,
	type HasCondition,
	type Model,
	type TranslationConfig,
} from '@c15t/core';
import type {
	ConsentState,
	KernelActiveUI,
	KernelIABState,
	PolicyUiSurfaceConfig,
} from '@c15t/core/v3';
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
import type { ReactIABState } from '../iab-context';
import { defaultTranslationConfig } from '../utils/default-translation-config';

type SaveType = 'all' | 'custom' | 'necessary';

const EMPTY_POLICY_SURFACE: PolicyUiSurfaceConfig = {};
const DEFAULT_CONSENT_TYPES: ConsentType[] = [
	{
		name: 'necessary',
		gdprType: 1,
		description: 'Required for basic site functionality',
		defaultValue: true,
		disabled: true,
		display: true,
	},
	{
		name: 'functionality',
		gdprType: 2,
		description: 'Enables enhanced features',
		defaultValue: false,
		display: true,
	},
	{
		name: 'measurement',
		gdprType: 4,
		description: 'Analytics and performance measurement',
		defaultValue: false,
		display: true,
	},
	{
		name: 'experience',
		gdprType: 3,
		description: 'Improves your experience',
		defaultValue: false,
		display: true,
	},
	{
		name: 'marketing',
		gdprType: 5,
		description: 'Advertising and marketing',
		defaultValue: false,
		display: true,
	},
];

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

function evaluateHas(
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
}

function toLightweightIab(iab: KernelIABState | null): ReactIABState | null {
	if (!iab) return null;
	const noop = () => {};
	const noopAsync = async () => {};

	return {
		...iab,
		config: {
			enabled: false,
			cmpId: iab.cmpId,
		},
		isLoadingGVL: iab.enabled,
		nonIABVendors: iab.customVendors,
		preferenceCenterTab: 'purposes',
		setPreferenceCenterTab: noop,
		setVendorConsent: noop,
		setVendorLegitimateInterest: noop,
		setPurposeConsent: noop,
		setPurposeLegitimateInterest: noop,
		setSpecialFeatureOptIn: noop,
		acceptAll: noop,
		rejectAll: noop,
		save: noopAsync,
	};
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
	const iab = useMemo(() => toLightweightIab(snapshot.iab), [snapshot.iab]);
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
			: DEFAULT_CONSENT_TYPES.map((type) => type.name);
	}, [policyCategories]);

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
