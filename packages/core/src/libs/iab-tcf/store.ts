import type { ConsentManagerInterface } from '../../client/client-interface';
import type { ConsentStoreState } from '../../store/type';
import type { GlobalVendorList } from '../../types';
import type { NonIABVendor } from '../../types/non-iab-vendor';
import { saveConsentToStorage } from '../cookie';
import { generateSubjectId } from '../generate-subject-id';
import { applyPolicyPurposeAllowlist, getEffectivePolicy } from '../policy';
import { CMP_ID, CMP_VERSION } from './cmp-defaults';
import type { IABActions, IABConfig, IABManager, IABState } from './types';

/**
 * Creates the initial IAB state with default values.
 *
 * @param config - The IAB configuration from store options
 * @returns Initial IAB state with empty consent records
 *
 * @internal
 */
export function createInitialIABState(config: IABConfig): IABState {
	return {
		config,
		gvl: null,
		isLoadingGVL: false,
		nonIABVendors: [],
		tcString: null,
		vendorConsents: {},
		vendorLegitimateInterests: {},
		purposeConsents: {},
		purposeLegitimateInterests: {},
		specialFeatureOptIns: {},
		vendorsDisclosed: {},
		cmpApi: null,
		preferenceCenterTab: 'purposes',
	};
}

/**
 * Creates IAB action methods that operate on nested IAB state.
 *
 * @remarks
 * The returned actions close over getState/setState and update the nested
 * `iab` property of the store. These are combined with IABState to form
 * the complete IABManager.
 *
 * @param getState - Function to get the current state from the store
 * @param setState - Function to update the state in the store
 * @param manager - The consent manager interface for API calls
 * @returns IAB action methods
 *
 * @internal
 */
export function createIABActions(
	getState: () => ConsentStoreState,
	setState: (partial: Partial<ConsentStoreState>) => void,
	manager: ConsentManagerInterface
): IABActions {
	/**
	 * Helper to update nested IAB state.
	 */
	const updateState = (updates: Partial<IABState>): void => {
		const { iab } = getState();
		if (!iab) {
			return;
		}
		// Preserve the action methods when updating state
		setState({
			iab: { ...iab, ...updates },
		});
	};

	return {
		_updateState: updateState,

		setPurposeConsent: (purposeId: number, value: boolean) => {
			const { iab } = getState();
			if (!iab) {
				return;
			}
			updateState({
				purposeConsents: {
					...iab.purposeConsents,
					[purposeId]: value,
				},
			});
		},

		setPurposeLegitimateInterest: (purposeId: number, value: boolean) => {
			const { iab } = getState();
			if (!iab) {
				return;
			}
			updateState({
				purposeLegitimateInterests: {
					...iab.purposeLegitimateInterests,
					[purposeId]: value,
				},
			});
		},

		setVendorConsent: (vendorId: number | string, value: boolean) => {
			const { iab } = getState();
			if (!iab) {
				return;
			}
			updateState({
				vendorConsents: {
					...iab.vendorConsents,
					[String(vendorId)]: value,
				},
			});
		},

		setVendorLegitimateInterest: (
			vendorId: number | string,
			value: boolean
		) => {
			const { iab } = getState();
			if (!iab) {
				return;
			}
			updateState({
				vendorLegitimateInterests: {
					...iab.vendorLegitimateInterests,
					[String(vendorId)]: value,
				},
			});
		},

		setSpecialFeatureOptIn: (featureId: number, value: boolean) => {
			const { iab } = getState();
			if (!iab) {
				return;
			}
			updateState({
				specialFeatureOptIns: {
					...iab.specialFeatureOptIns,
					[featureId]: value,
				},
			});
		},

		setPreferenceCenterTab: (tab) => {
			updateState({ preferenceCenterTab: tab });
		},

		acceptAll: () => {
			const { iab } = getState();
			if (!iab?.gvl) {
				return;
			}

			const { purposeConsents, purposeLegitimateInterests } =
				buildAllPurposeConsents(iab.gvl, true);
			const { vendorConsents, vendorLegitimateInterests } =
				buildAllVendorConsents(iab.gvl, iab.nonIABVendors, true);
			const specialFeatureOptIns = buildAllSpecialFeatureOptIns(iab.gvl, true);

			updateState({
				purposeConsents,
				purposeLegitimateInterests,
				vendorConsents,
				vendorLegitimateInterests,
				specialFeatureOptIns,
			});
		},

		rejectAll: () => {
			const { iab } = getState();
			if (!iab?.gvl) {
				return;
			}

			// Reject all purposes except Purpose 1 (strictly necessary)
			const purposeConsents: Record<number, boolean> = { 1: true };
			const purposeLegitimateInterests: Record<number, boolean> = {};
			for (const purposeId of Object.keys(iab.gvl.purposes)) {
				if (Number(purposeId) !== 1) {
					purposeConsents[Number(purposeId)] = false;
					purposeLegitimateInterests[Number(purposeId)] = false;
				}
			}

			const { vendorConsents, vendorLegitimateInterests } =
				buildAllVendorConsents(iab.gvl, iab.nonIABVendors, false);
			const specialFeatureOptIns = buildAllSpecialFeatureOptIns(iab.gvl, false);

			updateState({
				purposeConsents,
				purposeLegitimateInterests,
				vendorConsents,
				vendorLegitimateInterests,
				specialFeatureOptIns,
			});
		},

		save: async () => {
			const { iab, locationInfo, user, callbacks } = getState();

			if (!iab?.cmpApi || !iab.gvl) {
				return;
			}

			const {
				config: iabConfig,
				gvl,
				cmpApi,
				purposeConsents,
				purposeLegitimateInterests,
				vendorConsents,
				vendorLegitimateInterests,
				specialFeatureOptIns,
			} = iab;

			// Dynamically import TC String generation
			const { generateTCString, iabPurposesToC15tConsents } = await import(
				'./index'
			);

			// Build vendorsDisclosed from all GVL vendors (all are disclosed in UI)
			const vendorsDisclosed: Record<number, boolean> = {};
			for (const vendorId of Object.keys(gvl.vendors)) {
				vendorsDisclosed[Number(vendorId)] = true;
			}

			// Generate TC String
			const tcString = await generateTCString(
				{
					purposeConsents,
					purposeLegitimateInterests,
					vendorConsents,
					vendorLegitimateInterests,
					specialFeatureOptIns,
					vendorsDisclosed,
				},
				gvl,
				{
					cmpId: iabConfig.cmpId ?? CMP_ID,
					cmpVersion: iabConfig.cmpVersion ?? CMP_VERSION,
					publisherCountryCode: iabConfig.publisherCountryCode ?? 'GB',
					isServiceSpecific: iabConfig.isServiceSpecific ?? true,
				}
			);

			// Save to storage and update CMP API
			cmpApi.saveToStorage(tcString);
			cmpApi.updateConsent(tcString);

			// Map IAB consents to c15t consents
			const c15tConsents = iabPurposesToC15tConsents(purposeConsents);
			const policyCategories = getEffectivePolicy(
				getState().lastBannerFetchData
			)?.consent?.categories;
			const effectiveConsents = applyPolicyPurposeAllowlist(
				c15tConsents,
				policyCategories
			);

			const givenAt = Date.now();

			// Update IAB state with TC string and vendors disclosed
			updateState({
				tcString,
				vendorsDisclosed,
			});

			// Get or generate subjectId
			let subjectId = getState().consentInfo?.subjectId;
			if (!subjectId) {
				subjectId = generateSubjectId();
			}

			// Update core consent state
			setState({
				consents: effectiveConsents,
				selectedConsents: effectiveConsents,
				activeUI: 'none' as const,
				consentInfo: {
					time: givenAt,
					subjectId,
					externalId: user?.id,
					identityProvider: user?.identityProvider,
				},
			});

			// Persist custom vendor consents (string IDs are not in TC String)
			const customVendorConsents: Record<string, boolean> = {};
			const customVendorLegitimateInterests: Record<string, boolean> = {};
			for (const vendor of iab.nonIABVendors) {
				const vendorKey = String(vendor.id);
				if (vendor.purposes && vendor.purposes.length > 0) {
					customVendorConsents[vendorKey] = vendorConsents[vendorKey] ?? false;
				}
				if (vendor.legIntPurposes && vendor.legIntPurposes.length > 0) {
					customVendorLegitimateInterests[vendorKey] =
						vendorLegitimateInterests[vendorKey] ?? true;
				}
			}

			saveConsentToStorage(
				{
					consents: effectiveConsents,
					consentInfo: {
						time: givenAt,
						subjectId,
						externalId: user?.id,
						identityProvider: user?.identityProvider,
					},
					iabCustomVendorConsents: customVendorConsents,
					iabCustomVendorLegitimateInterests: customVendorLegitimateInterests,
				},
				undefined,
				getState().storageConfig
			);

			// Update scripts based on new consent state
			getState().updateScripts();

			// Send consent to backend API
			const consent = await manager.setConsent({
				body: {
					subjectId,
					givenAt,
					type: 'cookie_banner',
					domain: typeof window !== 'undefined' ? window.location.hostname : '',
					preferences: effectiveConsents,
					externalSubjectId: user?.id,
					identityProvider: user?.identityProvider,
					tcString,
					jurisdiction: locationInfo?.jurisdiction ?? undefined,
					jurisdictionModel: 'iab',
					metadata: {
						source: 'iab_tcf',
						acceptanceMethod: 'iab',
					},
				},
			});

			// Handle error case if the API request fails
			if (!consent.ok) {
				const errorMsg =
					consent.error?.message ?? 'Failed to save IAB consents';
				callbacks.onError?.({
					error: errorMsg,
				});
				// Fallback console only when no handler is provided
				if (!callbacks.onError) {
					console.error(errorMsg);
				}
			}
		},
	};
}

/**
 * Creates a complete IAB manager with state and actions.
 *
 * @param config - IAB configuration
 * @param getState - Function to get the current state from the store
 * @param setState - Function to update the state in the store
 * @param manager - The consent manager interface for API calls
 * @returns Complete IABManager with state and actions
 *
 * @internal
 */
export function createIABManager(
	config: IABConfig,
	getState: () => ConsentStoreState,
	setState: (partial: Partial<ConsentStoreState>) => void,
	manager: ConsentManagerInterface
): IABManager {
	const state = createInitialIABState(config);
	const actions = createIABActions(getState, setState, manager);

	return {
		...state,
		...actions,
	};
}

/**
 * Builds purpose consent objects for all purposes in the GVL.
 */
function buildAllPurposeConsents(
	gvl: GlobalVendorList,
	value: boolean
): {
	purposeConsents: Record<number, boolean>;
	purposeLegitimateInterests: Record<number, boolean>;
} {
	const purposeConsents: Record<number, boolean> = {};
	const purposeLegitimateInterests: Record<number, boolean> = {};

	for (const purposeId of Object.keys(gvl.purposes)) {
		purposeConsents[Number(purposeId)] = value;
		purposeLegitimateInterests[Number(purposeId)] = value;
	}

	return { purposeConsents, purposeLegitimateInterests };
}

/**
 * Builds vendor consent objects for all GVL vendors + custom vendors.
 *
 * @remarks
 * - Only sets consent for vendors that have consent-based purposes (purposes.length > 0)
 * - Only sets LI for vendors that have LI-based purposes (legIntPurposes.length > 0)
 * - This ensures internal state matches what the TC string will encode
 * - Custom vendors are keyed by their configured IDs to avoid collisions
 */
function buildAllVendorConsents(
	gvl: GlobalVendorList,
	customVendors: NonIABVendor[],
	value: boolean
): {
	vendorConsents: Record<string, boolean>;
	vendorLegitimateInterests: Record<string, boolean>;
} {
	const vendorConsents: Record<string, boolean> = {};
	const vendorLegitimateInterests: Record<string, boolean> = {};

	// Add GVL vendors - only set consent/LI for vendors that actually use those legal bases
	for (const [vendorId, vendor] of Object.entries(gvl.vendors)) {
		const id = String(vendorId);
		// Only set consent for vendors that have consent-based purposes
		if (vendor.purposes && vendor.purposes.length > 0) {
			vendorConsents[id] = value;
		}
		// Only set LI for vendors that have LI-based purposes
		if (vendor.legIntPurposes && vendor.legIntPurposes.length > 0) {
			vendorLegitimateInterests[id] = value;
		}
	}

	// Add custom vendors using their configured IDs
	customVendors.forEach((cv) => {
		const customVendorId = String(cv.id);
		// Custom vendors: set consent if they have purposes
		if (cv.purposes && cv.purposes.length > 0) {
			vendorConsents[customVendorId] = value;
		}
		// Custom vendors: set LI if they have legIntPurposes
		if (cv.legIntPurposes && cv.legIntPurposes.length > 0) {
			vendorLegitimateInterests[customVendorId] = value;
		}
	});

	return { vendorConsents, vendorLegitimateInterests };
}

/**
 * Builds special feature opt-in objects for all special features in the GVL.
 */
function buildAllSpecialFeatureOptIns(
	gvl: GlobalVendorList,
	value: boolean
): Record<number, boolean> {
	const specialFeatureOptIns: Record<number, boolean> = {};

	for (const featureId of Object.keys(gvl.specialFeatures)) {
		specialFeatureOptIns[Number(featureId)] = value;
	}

	return specialFeatureOptIns;
}
