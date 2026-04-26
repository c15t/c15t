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
	ConsentSnapshot,
	ConsentState,
	KernelActiveUI,
	PolicyUiSurfaceConfig,
} from 'c15t/v3';
import { useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import { KernelContext } from '../context';
import { useConsentDraft } from '../draft';
import { useIAB } from '../iab-context';

type SaveType = 'all' | 'custom' | 'necessary';

const EMPTY_POLICY_SURFACE: PolicyUiSurfaceConfig = {};

function useKernelSnapshot(): ConsentSnapshot {
	const kernel = useContext(KernelContext);
	if (!kernel) {
		throw new Error(
			'useConsentManager must be used within <ConsentProvider options={...}> from @c15t/react/v3'
		);
	}

	return useSyncExternalStore(
		(listener) => kernel.subscribe(listener),
		() => kernel.getSnapshot(),
		() => kernel.getSnapshot()
	);
}

function toTranslationConfig(snapshot: ConsentSnapshot): TranslationConfig {
	const resolved = snapshot.translations;
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
	const kernel = useContext(KernelContext);
	if (!kernel) {
		throw new Error(
			'useConsentManager must be used within <ConsentProvider options={...}> from @c15t/react/v3'
		);
	}

	const snapshot = useKernelSnapshot();
	const draft = useConsentDraft();
	const iab = useIAB();
	const translationConfig = useMemo(
		() => toTranslationConfig(snapshot),
		[snapshot]
	);

	const policyCategories = useMemo(
		() => Array.from(snapshot.policyCategories),
		[snapshot.policyCategories]
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
			evaluateHas(condition, snapshot.consents as ConsentState, {
				policyCategories: policyCategories.length > 0 ? policyCategories : null,
				policyScopeMode: snapshot.policyScopeMode,
			}),
		[snapshot.consents, snapshot.policyScopeMode, policyCategories]
	);

	const hasConsented = useCallback(
		() => snapshot.hasConsented,
		[snapshot.hasConsented]
	);

	const setActiveUI = useCallback(
		(ui: ActiveUI) => {
			(
				kernel.set as typeof kernel.set & {
					activeUI(ui: KernelActiveUI): void;
				}
			).activeUI(ui as KernelActiveUI);
		},
		[kernel]
	);

	const saveConsents = useCallback(
		async (type: SaveType, _options?: { uiSource?: string }) => {
			if (type === 'all') {
				await kernel.commands.save('all');
				draft.reset();
				return;
			}
			if (type === 'necessary') {
				await kernel.commands.save('none');
				draft.reset();
				return;
			}
			await draft.save();
		},
		[draft, kernel]
	);

	const setConsent = useCallback(
		(name: AllConsentNames, value: boolean) => {
			kernel.set.consent({ [name]: value } as Partial<ConsentState>);
		},
		[kernel]
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
			kernel.subscribe((next) => listener(next.consents as ConsentState)),
		[kernel]
	);

	return {
		...snapshot,
		activeUI: toActiveUI(snapshot.activeUI),
		branding: snapshot.branding ?? 'c15t',
		consents: snapshot.consents as ConsentState,
		selectedConsents: draft.values,
		consentInfo: snapshot.hasConsented ? { type: 'v3' } : null,
		consentCategories,
		consentTypes: getDisplayedConsents(),
		getDisplayedConsents,
		has,
		hasConsented,
		iab,
		manager: null,
		model: (snapshot.model ?? 'opt-in') as Model,
		policyBanner: snapshot.policyBanner ?? EMPTY_POLICY_SURFACE,
		policyCategories,
		policyDialog: snapshot.policyDialog ?? EMPTY_POLICY_SURFACE,
		policyScopeMode: snapshot.policyScopeMode,
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
