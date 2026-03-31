/**
 * Store update logic for consent manager initialization.
 *
 * @packageDocumentation
 */

import type { JurisdictionCode } from '@c15t/schema/types';
import { createMaterialPolicyFingerprint } from '@c15t/schema/types';
import {
	prepareTranslationConfig,
	type TranslationInputConfig,
} from '@c15t/translations';
import type { ConsentStoreState } from '../../store/type';
import { allConsentNames, type ConsentState } from '../../types';
import type { GlobalVendorList } from '../../types/iab-tcf';
import { deleteConsentFromStorage, saveConsentToStorage } from '../cookie';
import { determineModel } from '../determine-model';
import { hasGlobalPrivacyControlSignal } from '../global-privacy-control';
import {
	applyPolicyPurposeAllowlist,
	filterConsentCategoriesByPolicy,
} from '../policy';
import type { ConsentBannerResponse, InitConsentManagerConfig } from './types';

interface InitSourceMetadata {
	initDataSource: ConsentStoreState['initDataSource'];
	initDataSourceDetail?: string | null;
}

/**
 * Calculates auto-granted consents based on consent model and GPC signal.
 *
 * @param shouldAutoGrant - Whether consents should be auto-granted
 * @param hasGpcSignal - Whether Global Privacy Control signal is present
 * @returns Auto-granted consents or null if not applicable
 */
function calculateAutoGrantedConsents(
	shouldAutoGrant: boolean,
	hasGpcSignal: boolean
): ConsentState | null {
	if (!shouldAutoGrant) {
		return null;
	}

	// When a GPC signal is present, treat it as an opt-out for
	// marketing and measurement under CCPA-style rules.
	return {
		necessary: true,
		functionality: true,
		experience: true,
		marketing: !hasGpcSignal,
		measurement: !hasGpcSignal,
	};
}

/**
 * Computes auto-grant information based on jurisdiction and current state.
 *
 * @param jurisdiction - The jurisdiction code
 * @param iabEnabled - Whether IAB mode is enabled
 * @param consentInfo - Current consent info from store
 * @param gpcOverride - Optional override for the GPC signal (true/false to force, undefined to use browser)
 * @returns Object containing consent model and auto-granted consents
 */
function computeAutoGrantInfo(
	jurisdiction: JurisdictionCode | null,
	iabEnabled: boolean | undefined,
	consentInfo: ConsentStoreState['consentInfo'],
	policyModel?: 'opt-in' | 'opt-out' | 'none' | 'iab',
	gpcOverride?: boolean,
	policyGpc?: boolean
) {
	const consentModel =
		policyModel === 'none'
			? null
			: (policyModel ?? determineModel(jurisdiction, iabEnabled));

	// When a policy is active, defer to its `respectGpc` flag.
	// When no policy is configured (policyGpc is undefined),
	// fall back to the legacy behaviour which always checks the signal.
	const shouldCheckGpc = policyGpc !== undefined ? policyGpc : true;
	const hasGpcSignal = shouldCheckGpc
		? gpcOverride !== undefined
			? gpcOverride
			: hasGlobalPrivacyControlSignal()
		: false;

	// Auto-grant only when no regulation applies and no existing consent
	const shouldAutoGrantConsents =
		(consentModel === null || consentModel === 'opt-out') &&
		consentInfo === null;

	const autoGrantedConsents = calculateAutoGrantedConsents(
		shouldAutoGrantConsents,
		hasGpcSignal
	);

	return { consentModel, autoGrantedConsents };
}

/**
 * Builds the store update object from banner response data.
 *
 * @param data - Banner response data
 * @param config - Init configuration
 * @param effectiveIABEnabled - Whether IAB is effectively enabled (considering server override)
 * @returns Partial store state to merge
 */
function buildStoreUpdate(
	data: ConsentBannerResponse,
	config: InitConsentManagerConfig,
	effectiveIABEnabled: boolean | undefined,
	initSourceMetadata?: InitSourceMetadata
): Partial<ConsentStoreState> {
	const { get, initialTranslationConfig } = config;
	const { consentInfo, consentTypes } = get();
	const { translations, location } = data;

	// Compute auto-grant info using effective IAB enabled state
	// This ensures the model is 'opt-in' instead of 'iab' when server disables GVL
	const { consentModel, autoGrantedConsents } = computeAutoGrantInfo(
		(data.jurisdiction as JurisdictionCode) ?? null,
		effectiveIABEnabled,
		consentInfo,
		data.policy?.model,
		config.get().overrides?.gpc,
		data.policy?.consent?.gpc
	);

	// Build base update
	const update: Partial<ConsentStoreState> = {
		model: consentModel,
		isLoadingConsentInfo: false,
		branding: data.branding ?? 'c15t',
		hasFetchedBanner: true,
		lastBannerFetchData: data,
		locationInfo: {
			countryCode: location?.countryCode ?? null,
			regionCode: location?.regionCode ?? null,
			jurisdiction: data.jurisdiction ?? null,
		},
		policyBanner: {
			allowedActions: data.policy?.ui?.banner?.allowedActions,
			primaryAction: data.policy?.ui?.banner?.primaryAction,
			layout: data.policy?.ui?.banner?.layout,
			direction: data.policy?.ui?.banner?.direction,
			uiProfile: data.policy?.ui?.banner?.uiProfile,
			scrollLock: data.policy?.ui?.banner?.scrollLock,
		},
		policyDialog: {
			allowedActions: data.policy?.ui?.dialog?.allowedActions,
			primaryAction: data.policy?.ui?.dialog?.primaryAction,
			layout: data.policy?.ui?.dialog?.layout,
			direction: data.policy?.ui?.dialog?.direction,
			uiProfile: data.policy?.ui?.dialog?.uiProfile,
			scrollLock: data.policy?.ui?.dialog?.scrollLock,
		},
		policyCategories: data.policy?.consent?.categories ?? null,
		policyScopeMode: data.policy?.consent?.scopeMode ?? null,
		initDataSource: initSourceMetadata?.initDataSource ?? null,
		initDataSourceDetail: initSourceMetadata?.initDataSourceDetail ?? null,
	};

	// Show banner if no existing consent and regulation applies
	if (consentInfo === null) {
		if (data.policy?.ui?.mode) {
			update.activeUI = data.policy.ui.mode;
		} else {
			update.activeUI = consentModel ? 'banner' : 'none';
		}
	}

	// Auto-grant consents if applicable
	if (autoGrantedConsents) {
		update.consents = autoGrantedConsents;
		update.selectedConsents = autoGrantedConsents;
	}

	// Apply policy-driven purpose/category restrictions for non-wildcard scope.
	// Out-of-policy categories are treated as out-of-scope (hidden + forced false),
	// not as granted consent.
	const policyCategories = data.policy?.consent?.categories;
	const hasPolicyCategoryAllowlist =
		Array.isArray(policyCategories) &&
		policyCategories.length > 0 &&
		!policyCategories.includes('*');
	if (hasPolicyCategoryAllowlist) {
		const uniqueAllowedCategories = filterConsentCategoriesByPolicy(
			allConsentNames,
			policyCategories
		);

		update.consentCategories = uniqueAllowedCategories;
		update.consents = applyPolicyPurposeAllowlist(
			update.consents ?? get().consents,
			uniqueAllowedCategories
		);
		update.selectedConsents = applyPolicyPurposeAllowlist(
			update.selectedConsents ?? get().selectedConsents,
			uniqueAllowedCategories
		);
	}

	const preselectedCategories = data.policy?.consent?.preselectedCategories;
	const shouldApplyPreselectedCategories =
		consentInfo === null &&
		!autoGrantedConsents &&
		Array.isArray(preselectedCategories) &&
		preselectedCategories.length > 0;
	if (shouldApplyPreselectedCategories) {
		const preselectedScope = hasPolicyCategoryAllowlist
			? filterConsentCategoriesByPolicy(allConsentNames, policyCategories)
			: allConsentNames;
		const allowedPreselectedCategories = filterConsentCategoriesByPolicy(
			preselectedScope,
			preselectedCategories
		);
		const preselectedSet = new Set(allowedPreselectedCategories);
		const selectedConsentBaseline =
			update.selectedConsents ?? get().selectedConsents;

		update.selectedConsents =
			consentTypes.length > 0
				? consentTypes.reduce((acc, consent) => {
						acc[consent.name] =
							consent.disabled === true
								? consent.defaultValue
								: preselectedSet.has(consent.name);
						return acc;
					}, {} as ConsentState)
				: (Object.fromEntries(
						Object.keys(selectedConsentBaseline).map((category) => [
							category,
							category === 'necessary' ||
								preselectedSet.has(category as keyof ConsentState),
						])
					) as ConsentState);
	}

	// Prepare translation config
	if (translations?.language && translations?.translations) {
		let customMessages: TranslationInputConfig | undefined;
		if (initialTranslationConfig?.translations) {
			customMessages = {
				translations: initialTranslationConfig.translations,
			};
		} else {
			customMessages = undefined;
		}

		update.translationConfig = prepareTranslationConfig(
			{
				translations: {
					[translations.language]: translations.translations,
				},
				disableAutoLanguageSwitch: true,
				defaultLanguage: translations.language,
			},
			customMessages
		);
	}

	return update;
}

/**
 * Triggers callbacks after store update.
 *
 * @param data - Banner response data
 * @param config - Init configuration
 * @param autoGrantedConsents - Auto-granted consents if applicable
 */
function triggerCallbacks(
	data: ConsentBannerResponse,
	config: InitConsentManagerConfig,
	autoGrantedConsents: ConsentState | null
): void {
	const { get } = config;
	const { callbacks } = get();
	const { translations } = data;

	// Trigger onConsentSet callback when consents are automatically granted
	if (autoGrantedConsents) {
		callbacks?.onConsentSet?.({
			preferences: autoGrantedConsents,
		});
	}

	// Trigger onBannerFetched callback
	if (translations?.language && translations?.translations) {
		callbacks?.onBannerFetched?.({
			jurisdiction: data.jurisdiction,
			location: data.location,
			translations: {
				language: translations.language,
				translations: translations.translations,
			},
		});
	}
}

function getDefaultConsents(
	consentTypes: ConsentStoreState['consentTypes']
): ConsentState {
	return consentTypes.reduce((acc, consent) => {
		acc[consent.name] = consent.defaultValue;
		return acc;
	}, {} as ConsentState);
}

/**
 * Updates the store with consent banner data.
 *
 * This function:
 * 1. Determines the consent model based on jurisdiction
 * 2. Auto-grants consents if no regulation applies
 * 3. Updates location and translation info
 * 4. Triggers appropriate callbacks
 * 5. Initializes IAB mode if enabled and GVL is available
 *
 * Note: If client has IAB enabled but server returns 200 without GVL,
 * the IAB settings will be overridden to disabled (server takes precedence).
 *
 * @param data - Banner response data from the API
 * @param config - Init configuration
 * @param _hasLocalStorageAccess - Whether localStorage is accessible
 * @param prefetchedGVL - Optional prefetched GVL from SSR or init response
 */
export async function updateStore(
	data: ConsentBannerResponse,
	config: InitConsentManagerConfig,
	_hasLocalStorageAccess: boolean,
	prefetchedGVL?: GlobalVendorList | null,
	initSourceMetadata?: InitSourceMetadata
): Promise<void> {
	const { set, get } = config;
	const initialState = get();
	const currentPolicyFingerprint = data.policy
		? await createMaterialPolicyFingerprint(data.policy)
		: undefined;

	if (initialState.consentInfo && currentPolicyFingerprint) {
		const storedPolicyFingerprint =
			initialState.consentInfo.materialPolicyFingerprint;

		if (
			storedPolicyFingerprint &&
			storedPolicyFingerprint !== currentPolicyFingerprint
		) {
			const resetConsents = getDefaultConsents(initialState.consentTypes);
			deleteConsentFromStorage(undefined, initialState.storageConfig);
			set({
				consents: resetConsents,
				selectedConsents: resetConsents,
				consentInfo: null,
			});
		} else if (!storedPolicyFingerprint) {
			const updatedConsentInfo = {
				...initialState.consentInfo,
				materialPolicyFingerprint: currentPolicyFingerprint,
			};
			saveConsentToStorage(
				{
					consents: initialState.consents,
					consentInfo: updatedConsentInfo,
				},
				undefined,
				initialState.storageConfig
			);
			set({ consentInfo: updatedConsentInfo });
		}
	}

	const { consentInfo } = get();

	// Lazily create the IAB manager when iabConfig is provided.
	// The _module is injected by @c15t/iab's iab() factory — core never imports IAB runtime.
	let iab = get().iab;
	if (config.iabConfig && !iab) {
		const iabModule = config.iabConfig._module;
		if (!iabModule) {
			console.error(
				'[c15t] IAB config provided without IAB module. ' +
					'Install @c15t/iab and use the iab() wrapper: ' +
					'`import { iab } from "@c15t/iab"; iab({ cmpId: ... })`'
			);
		} else {
			iab = iabModule.createIABManager(
				config.iabConfig,
				get,
				set,
				config.manager
			);
			set({ iab });
		}
	}

	// Check if client has IAB enabled but server didn't provide GVL
	// This means the server has disabled IAB/GVL, so we should override client settings
	const serverDisabledGVL = iab?.config.enabled && !prefetchedGVL;
	const effectiveIABEnabled = iab?.config.enabled && !serverDisabledGVL;

	// Log warning if IAB was overridden
	if (serverDisabledGVL) {
		console.warn(
			'IAB mode disabled: Server returned 200 without GVL. Client IAB settings overridden.'
		);
	}

	// Compute auto-grant info once to be used by buildStoreUpdate and triggerCallbacks
	const { consentModel, autoGrantedConsents } = computeAutoGrantInfo(
		(data.jurisdiction as JurisdictionCode) ?? null,
		effectiveIABEnabled,
		consentInfo,
		data.policy?.model,
		get().overrides?.gpc,
		data.policy?.consent?.gpc
	);

	// Build and apply store update (pass effectiveIABEnabled so model is correctly set)
	const storeUpdate = buildStoreUpdate(
		data,
		config,
		effectiveIABEnabled,
		initSourceMetadata
	);

	// If server disabled GVL, update the IAB config in the store
	if (serverDisabledGVL && iab) {
		storeUpdate.iab = {
			...iab,
			config: {
				...iab.config,
				enabled: false,
			},
		};
	} else if (iab && data.cmpId != null) {
		// Persist server-provided cmpId in store so subsequent save() calls use it
		storeUpdate.iab = {
			...iab,
			config: {
				...iab.config,
				cmpId: data.cmpId,
			},
		};
	}

	set(storeUpdate);

	// Trigger callbacks
	triggerCallbacks(data, config, autoGrantedConsents);

	// Update scripts based on current consent state
	get().updateScripts();

	// Initialize IAB mode if effectively enabled and in IAB jurisdiction
	if (effectiveIABEnabled && consentModel === 'iab' && iab) {
		// Merge server-provided customVendors with client-configured ones
		const serverCustomVendors = data.customVendors ?? [];
		const clientCustomVendors = iab.config.customVendors ?? [];

		// Deduplicate by vendor ID (server vendors take precedence)
		const serverVendorIds = new Set(serverCustomVendors.map((v) => v.id));
		const mergedCustomVendors = [
			...serverCustomVendors,
			...clientCustomVendors.filter((v) => !serverVendorIds.has(v.id)),
		];

		// Create merged config with customVendors from both sources
		// Server-provided cmpId takes precedence over client-configured cmpId
		const mergedConfig = {
			...iab.config,
			customVendors: mergedCustomVendors,
			...(data.cmpId != null && { cmpId: data.cmpId }),
		};

		// Non-blocking initialization - errors are handled within initializeIABMode
		const iabModule = config.iabConfig?._module;
		if (iabModule) {
			iabModule
				.initializeIABMode(mergedConfig, { set, get }, prefetchedGVL)
				.catch((err) => {
					console.error('Failed to initialize IAB mode in updateStore:', err);
				});
		}
	}
}
