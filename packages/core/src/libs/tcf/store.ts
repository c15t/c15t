import type { ConsentManagerInterface } from '../../client/client-interface';
import type { ConsentStoreState } from '../../store/type';
import type { GlobalVendorList } from '../../types';
import type { IABConfig } from './types';

/**
 * Creates IAB TCF management functions for the consent manager store.
 *
 * @remarks
 * The returned methods are intended to be spread into the
 * {@link ConsentStoreState} and provide IAB TCF consent management
 * based on the TCF 2.3 specification.
 *
 * @param getState - Function to get the current state from the store
 * @param setState - Function to update the state in the store
 * @param manager - The consent manager interface for API calls
 * @returns Object containing IAB TCF management functions
 *
 * @internal
 */
export function createIABManager(
	getState: () => ConsentStoreState,
	setState: (partial: Partial<ConsentStoreState>) => void,
	manager: ConsentManagerInterface
) {
	return {
		/**
		 * Sets IAB purpose consent.
		 *
		 * @param purposeId - IAB purpose ID (1-11)
		 * @param value - Whether consent is granted
		 */
		setPurposeConsent: (purposeId: number, value: boolean) => {
			setState({
				purposeConsents: {
					...getState().purposeConsents,
					[purposeId]: value,
				},
			});
		},

		/**
		 * Sets IAB purpose legitimate interest.
		 *
		 * @param purposeId - IAB purpose ID (1-11)
		 * @param value - Whether legitimate interest is established
		 */
		setPurposeLegitimateInterest: (purposeId: number, value: boolean) => {
			setState({
				purposeLegitimateInterests: {
					...getState().purposeLegitimateInterests,
					[purposeId]: value,
				},
			});
		},

		/**
		 * Sets IAB vendor consent.
		 *
		 * @param vendorId - IAB vendor ID
		 * @param value - Whether consent is granted
		 */
		setVendorConsent: (vendorId: number, value: boolean) => {
			setState({
				vendorConsents: {
					...getState().vendorConsents,
					[vendorId]: value,
				},
			});
		},

		/**
		 * Sets IAB vendor legitimate interest.
		 *
		 * @param vendorId - IAB vendor ID
		 * @param value - Whether legitimate interest is established
		 */
		setVendorLegitimateInterest: (vendorId: number, value: boolean) => {
			setState({
				vendorLegitimateInterests: {
					...getState().vendorLegitimateInterests,
					[vendorId]: value,
				},
			});
		},

		/**
		 * Sets special feature opt-in.
		 *
		 * @param featureId - IAB special feature ID (1-2)
		 * @param value - Whether opt-in is granted
		 */
		setSpecialFeatureOptIn: (featureId: number, value: boolean) => {
			setState({
				specialFeatureOptIns: {
					...getState().specialFeatureOptIns,
					[featureId]: value,
				},
			});
		},

		/**
		 * Accepts all IAB purposes, vendors, and special features.
		 */
		acceptAllIAB: () => {
			const { gvl, iabConfig } = getState();
			if (!gvl || !iabConfig) {
				return;
			}

			const { purposeConsents, purposeLegitimateInterests } =
				buildAllPurposeConsents(gvl, true);
			const { vendorConsents, vendorLegitimateInterests } =
				buildAllVendorConsents(iabConfig, true);
			const specialFeatureOptIns = buildAllSpecialFeatureOptIns(gvl, true);

			setState({
				purposeConsents,
				purposeLegitimateInterests,
				vendorConsents,
				vendorLegitimateInterests,
				specialFeatureOptIns,
			});
		},

		/**
		 * Rejects all IAB purposes (except necessary/Purpose 1) and vendors.
		 */
		rejectAllIAB: () => {
			const { gvl, iabConfig } = getState();
			if (!gvl || !iabConfig) {
				return;
			}

			// Reject all purposes except Purpose 1 (strictly necessary)
			const purposeConsents: Record<number, boolean> = { 1: true };
			const purposeLegitimateInterests: Record<number, boolean> = {};
			for (const purposeId of Object.keys(gvl.purposes)) {
				if (Number(purposeId) !== 1) {
					purposeConsents[Number(purposeId)] = false;
					purposeLegitimateInterests[Number(purposeId)] = false;
				}
			}

			const { vendorConsents, vendorLegitimateInterests } =
				buildAllVendorConsents(iabConfig, false);
			const specialFeatureOptIns = buildAllSpecialFeatureOptIns(gvl, false);

			setState({
				purposeConsents,
				purposeLegitimateInterests,
				vendorConsents,
				vendorLegitimateInterests,
				specialFeatureOptIns,
			});
		},

		/**
		 * Saves IAB consents and generates TC String.
		 *
		 * @returns Promise that resolves when consents are saved
		 */
		saveIABConsents: async () => {
			const {
				cmpApi,
				iabConfig,
				gvl,
				purposeConsents,
				purposeLegitimateInterests,
				vendorConsents,
				vendorLegitimateInterests,
				specialFeatureOptIns,
				locationInfo,
				user,
				callbacks,
			} = getState();

			if (!cmpApi || !iabConfig || !gvl) {
				return;
			}

			// Dynamically import TC String generation
			const { generateTCString, iabPurposesToC15tConsents } = await import(
				'./index'
			);

			// Generate TC String
			const tcString = await generateTCString(
				{
					purposeConsents,
					purposeLegitimateInterests,
					vendorConsents,
					vendorLegitimateInterests,
					specialFeatureOptIns,
				},
				gvl,
				{
					cmpId: iabConfig.cmpId,
					cmpVersion: iabConfig.cmpVersion ?? 1,
					publisherCountryCode: iabConfig.publisherCountryCode ?? 'GB',
					isServiceSpecific: iabConfig.isServiceSpecific ?? true,
				}
			);

			// Save to storage and update CMP API
			cmpApi.saveToStorage(tcString);
			cmpApi.updateConsent(tcString);

			// Map IAB consents to c15t consents
			const c15tConsents = iabPurposesToC15tConsents(purposeConsents);

			const givenAt = Date.now();

			setState({
				tcString,
				consents: c15tConsents,
				selectedConsents: c15tConsents,
				showPopup: false,
				consentInfo: {
					time: givenAt,
					identified: !!user?.id,
				},
			});

			// Update scripts based on new consent state
			getState().updateScripts();

			// Send consent to backend API
			const consent = await manager.setConsent({
				body: {
					givenAt,
					type: 'cookie_banner',
					domain: typeof window !== 'undefined' ? window.location.hostname : '',
					preferences: c15tConsents,
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

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────────────────────

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
 * Builds vendor consent objects for all configured vendors.
 */
function buildAllVendorConsents(
	iabConfig: IABConfig,
	value: boolean
): {
	vendorConsents: Record<number, boolean>;
	vendorLegitimateInterests: Record<number, boolean>;
} {
	const vendorConsents: Record<number, boolean> = {};
	const vendorLegitimateInterests: Record<number, boolean> = {};

	for (const vendorId of Object.keys(iabConfig.vendors)) {
		vendorConsents[Number(vendorId)] = value;
		vendorLegitimateInterests[Number(vendorId)] = value;
	}

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
