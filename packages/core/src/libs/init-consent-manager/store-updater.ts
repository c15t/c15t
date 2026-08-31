/**
 * Store update logic for consent manager initialization.
 *
 * @packageDocumentation
 */

import type { JurisdictionCode } from '@c15t/schema/types';
import { createMaterialPolicyFingerprint } from '@c15t/schema/types';
import { prepareTranslationConfig } from '@c15t/translations';

import type { ConsentStoreState } from '../../store/type';
import { allConsentNames } from '../../types';
import type { ConsentState } from '../../types';
import type { GlobalVendorList } from '../../types/iab-tcf';
import { deleteConsentFromStorage, saveConsentToStorage } from '../cookie';
import { determineModel } from '../determine-model';
import { hasGlobalPrivacyControlSignal } from '../global-privacy-control';
import {
	applyPolicyPurposeAllowlist,
	filterConsentCategoriesByPolicy,
	shouldEnforcePolicyCategoryScope,
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
const calculateAutoGrantedConsents = function calculateAutoGrantedConsents(
	shouldAutoGrant: boolean,
	hasGpcSignal: boolean
): ConsentState | null {
	if (!shouldAutoGrant) {
		return null;
	}

	// When a GPC signal is present, treat it as an opt-out for
	// marketing and measurement under CCPA-style rules.
	return {
		experience: true,
		functionality: true,
		marketing: !hasGpcSignal,
		measurement: !hasGpcSignal,
		necessary: true,
	};
};

/**
 * Computes auto-grant information based on jurisdiction and current state.
 *
 * @param jurisdiction - The jurisdiction code
 * @param iabEnabled - Whether IAB mode is enabled
 * @param consentInfo - Current consent info from store
 * @param gpcOverride - Optional override for the GPC signal (true/false to force, undefined to use browser)
 * @returns Object containing consent model and auto-granted consents
 */
const computeAutoGrantInfo = function computeAutoGrantInfo(
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
	const shouldCheckGpc = policyGpc === undefined ? true : policyGpc;
	let hasGpcSignal = false;
	if (shouldCheckGpc) {
		hasGpcSignal =
			gpcOverride === undefined ? hasGlobalPrivacyControlSignal() : gpcOverride;
	}

	// Auto-grant only when no regulation applies and no existing consent
	const shouldAutoGrantConsents =
		(consentModel === null || consentModel === 'opt-out') &&
		consentInfo === null;

	const autoGrantedConsents = calculateAutoGrantedConsents(
		shouldAutoGrantConsents,
		hasGpcSignal
	);

	return { autoGrantedConsents, consentModel };
};

type PolicySurfaceConfig = NonNullable<
	NonNullable<NonNullable<ConsentBannerResponse['policy']>['ui']>['banner']
>;

const buildPolicySurface = (surface: PolicySurfaceConfig | undefined) => {
	if (!surface) {
		return {};
	}
	return {
		allowedActions: surface.allowedActions,
		direction: surface.direction,
		layout: surface.layout,
		primaryActions: surface.primaryActions,
		scrollLock: surface.scrollLock,
		uiProfile: surface.uiProfile,
	};
};

const applyPolicyCategoryScope = (
	update: Partial<ConsentStoreState>,
	policyCategories: readonly string[] | undefined,
	scopeMode: 'strict' | 'permissive' | null | undefined,
	get: InitConsentManagerConfig['get']
): boolean => {
	const shouldApply = shouldEnforcePolicyCategoryScope(
		policyCategories ? [...policyCategories] : policyCategories,
		scopeMode ?? null
	);
	if (!shouldApply) {
		return false;
	}

	const uniqueAllowedCategories = filterConsentCategoriesByPolicy(
		allConsentNames,
		policyCategories ? [...policyCategories] : policyCategories
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
	return true;
};

const applyPreselectedCategories = (
	update: Partial<ConsentStoreState>,
	preselectedCategories: readonly string[] | undefined,
	policyCategories: readonly string[] | undefined,
	hasStrictPolicyCategoryAllowlist: boolean,
	consentInfo: ConsentStoreState['consentInfo'],
	autoGrantedConsents: ConsentState | null,
	consentTypes: ConsentStoreState['consentTypes'],
	get: InitConsentManagerConfig['get']
): void => {
	if (
		consentInfo !== null ||
		autoGrantedConsents ||
		!preselectedCategories?.length
	) {
		return;
	}

	const displayedConsentNames =
		update.consentCategories ?? get().consentCategories;
	const preselectedScope = hasStrictPolicyCategoryAllowlist
		? filterConsentCategoriesByPolicy(
				displayedConsentNames,
				policyCategories ? [...policyCategories] : policyCategories
			)
		: displayedConsentNames;
	const allowedPreselectedCategories = filterConsentCategoriesByPolicy(
		preselectedScope,
		preselectedCategories ? [...preselectedCategories] : preselectedCategories
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
};

const applyTranslations = (
	update: Partial<ConsentStoreState>,
	translations: ConsentBannerResponse['translations'],
	initialTranslationConfig: InitConsentManagerConfig['initialTranslationConfig']
): void => {
	if (!translations?.language || !translations.translations) {
		return;
	}
	const customMessages = initialTranslationConfig?.translations
		? { translations: initialTranslationConfig.translations }
		: undefined;
	update.translationConfig = prepareTranslationConfig(
		{
			defaultLanguage: translations.language,
			disableAutoLanguageSwitch: true,
			translations: {
				[translations.language]: translations.translations,
			},
		},
		customMessages
	);
};

const createBaseStoreUpdate = (
	data: ConsentBannerResponse,
	consentModel: ConsentStoreState['model'],
	initSourceMetadata?: InitSourceMetadata
): Partial<ConsentStoreState> => {
	const { location } = data;
	const policyConsent = data.policy?.consent;
	const policyUi = data.policy?.ui;
	return {
		branding: data.branding ?? 'c15t',
		hasFetchedBanner: true,
		initDataSource: initSourceMetadata?.initDataSource ?? null,
		initDataSourceDetail: initSourceMetadata?.initDataSourceDetail ?? null,
		isLoadingConsentInfo: false,
		lastBannerFetchData: data,
		locationInfo: {
			countryCode: location?.countryCode ?? null,
			jurisdiction: data.jurisdiction ?? null,
			regionCode: location?.regionCode ?? null,
		},
		model: consentModel,
		policyBanner: buildPolicySurface(policyUi?.banner),
		policyCategories: policyConsent?.categories ?? null,
		policyDialog: buildPolicySurface(policyUi?.dialog),
		policyScopeMode: policyConsent?.scopeMode ?? null,
	};
};

/**
 * Builds the store update object from banner response data.
 *
 * @param data - Banner response data
 * @param config - Init configuration
 * @param effectiveIABEnabled - Whether IAB is effectively enabled (considering server override)
 * @returns Partial store state to merge
 */
const buildStoreUpdate = function buildStoreUpdate(
	data: ConsentBannerResponse,
	config: InitConsentManagerConfig,
	effectiveIABEnabled: boolean | undefined,
	initSourceMetadata?: InitSourceMetadata
): Partial<ConsentStoreState> {
	const { get, initialTranslationConfig } = config;
	const { consentInfo, consentTypes } = get();
	const { translations } = data;
	const policyConsent = data.policy?.consent;
	const policyUi = data.policy?.ui;

	// Compute auto-grant info using effective IAB enabled state
	// This ensures the model is 'opt-in' instead of 'iab' when server disables GVL
	const { consentModel, autoGrantedConsents } = computeAutoGrantInfo(
		(data.jurisdiction as JurisdictionCode) ?? null,
		effectiveIABEnabled,
		consentInfo,
		data.policy?.model,
		config.get().overrides?.gpc,
		policyConsent?.gpc
	);

	// Build base update
	const update = createBaseStoreUpdate(data, consentModel, initSourceMetadata);

	// Show banner if no existing consent and regulation applies
	if (consentInfo === null) {
		if (policyUi?.mode) {
			update.activeUI = policyUi.mode;
		} else {
			update.activeUI = consentModel ? 'banner' : 'none';
		}
	}

	// Auto-grant consents if applicable
	if (autoGrantedConsents) {
		update.consents = autoGrantedConsents;
		update.selectedConsents = autoGrantedConsents;
	}

	// Apply policy-driven purpose/category restrictions for strict non-wildcard
	// scope. Permissive policies keep configured/script-derived categories visible.
	const policyCategories = policyConsent?.categories;
	const hasStrictPolicyCategoryAllowlist = applyPolicyCategoryScope(
		update,
		policyCategories,
		policyConsent?.scopeMode,
		get
	);
	applyPreselectedCategories(
		update,
		policyConsent?.preselectedCategories,
		policyCategories,
		hasStrictPolicyCategoryAllowlist,
		consentInfo,
		autoGrantedConsents,
		consentTypes,
		get
	);
	applyTranslations(update, translations, initialTranslationConfig);

	return update;
};

/**
 * Triggers callbacks after store update.
 *
 * @param data - Banner response data
 * @param config - Init configuration
 * @param autoGrantedConsents - Auto-granted consents if applicable
 */
const triggerCallbacks = function triggerCallbacks(
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
};

const getDefaultConsents = function getDefaultConsents(
	consentTypes: ConsentStoreState['consentTypes']
): ConsentState {
	return consentTypes.reduce((acc, consent) => {
		acc[consent.name] = consent.defaultValue;
		return acc;
	}, {} as ConsentState);
};

const reconcilePolicyFingerprint = async (
	data: ConsentBannerResponse,
	config: InitConsentManagerConfig
): Promise<void> => {
	const initialState = config.get();
	const currentPolicyFingerprint = data.policy
		? await createMaterialPolicyFingerprint(data.policy)
		: undefined;
	if (!initialState.consentInfo || !currentPolicyFingerprint) {
		return;
	}

	const storedPolicyFingerprint =
		initialState.consentInfo.materialPolicyFingerprint;
	if (
		storedPolicyFingerprint &&
		storedPolicyFingerprint !== currentPolicyFingerprint
	) {
		const resetConsents = getDefaultConsents(initialState.consentTypes);
		deleteConsentFromStorage(undefined, initialState.storageConfig);
		config.set({
			consentInfo: null,
			consents: resetConsents,
			selectedConsents: resetConsents,
		});
		return;
	}
	if (storedPolicyFingerprint) {
		return;
	}

	const updatedConsentInfo = {
		...initialState.consentInfo,
		materialPolicyFingerprint: currentPolicyFingerprint,
	};
	saveConsentToStorage(
		{
			consentInfo: updatedConsentInfo,
			consents: initialState.consents,
		},
		undefined,
		initialState.storageConfig
	);
	config.set({ consentInfo: updatedConsentInfo });
};

const ensureIabManager = (
	config: InitConsentManagerConfig
): ConsentStoreState['iab'] => {
	let { iab } = config.get();
	if (!config.iabConfig || iab) {
		return iab;
	}
	const iabModule = config.iabConfig._module;
	if (!iabModule) {
		console.error(
			'[c15t] IAB config provided without IAB module. ' +
				'Install @c15t/iab and use the iab() wrapper: ' +
				'`import { iab } from "@c15t/iab"; iab({ cmpId: ... })`'
		);
		return iab;
	}

	iab = iabModule.createIABManager(
		config.iabConfig,
		config.get,
		config.set,
		config.manager
	);
	config.set({ iab });
	return iab;
};

const applyIabStoreConfig = (
	storeUpdate: Partial<ConsentStoreState>,
	iab: ConsentStoreState['iab'],
	data: ConsentBannerResponse,
	serverDisabledGVL: boolean
): void => {
	if (!iab) {
		return;
	}
	if (serverDisabledGVL) {
		storeUpdate.iab = {
			...iab,
			config: { ...iab.config, enabled: false },
		};
		return;
	}
	if (data.cmpId !== null && data.cmpId !== undefined) {
		storeUpdate.iab = {
			...iab,
			config: { ...iab.config, cmpId: data.cmpId },
		};
	}
};

const startIabInitialization = (
	iab: NonNullable<ConsentStoreState['iab']>,
	data: ConsentBannerResponse,
	config: InitConsentManagerConfig,
	prefetchedGVL: GlobalVendorList | null | undefined
): void => {
	const iabModule = config.iabConfig?._module;
	if (!iabModule) {
		return;
	}
	const serverCustomVendors = data.customVendors ?? [];
	const clientCustomVendors = iab.config.customVendors ?? [];
	const serverVendorIds = new Set(
		serverCustomVendors.map((vendor) => vendor.id)
	);
	const mergedConfig = {
		...iab.config,
		customVendors: [
			...serverCustomVendors,
			...clientCustomVendors.filter(
				(vendor) => !serverVendorIds.has(vendor.id)
			),
		],
		...(data.cmpId !== null &&
			data.cmpId !== undefined && { cmpId: data.cmpId }),
	};
	void (async () => {
		try {
			await iabModule.initializeIABMode(
				mergedConfig,
				{ get: config.get, set: config.set },
				prefetchedGVL
			);
		} catch (error) {
			console.error('Failed to initialize IAB mode in updateStore:', error);
		}
	})();
};

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
export const updateStore = async function updateStore(
	data: ConsentBannerResponse,
	config: InitConsentManagerConfig,
	_hasLocalStorageAccess: boolean,
	prefetchedGVL?: GlobalVendorList | null,
	initSourceMetadata?: InitSourceMetadata
): Promise<void> {
	const { set, get } = config;
	await reconcilePolicyFingerprint(data, config);

	const { consentInfo } = get();

	// Lazily create the IAB manager when iabConfig is provided.
	// The _module is injected by @c15t/iab's iab() factory — core never imports IAB runtime.
	const iab = ensureIabManager(config);

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

	applyIabStoreConfig(storeUpdate, iab, data, Boolean(serverDisabledGVL));

	set(storeUpdate);

	// Trigger callbacks
	triggerCallbacks(data, config, autoGrantedConsents);

	// Update scripts based on current consent state
	get().updateScripts();

	// Initialize IAB mode if effectively enabled and in IAB jurisdiction
	if (effectiveIABEnabled && consentModel === 'iab' && iab) {
		startIabInitialization(iab, data, config, prefetchedGVL);
	}
};
