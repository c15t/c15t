import type { GlobalVendorList, NonIABVendor } from '@c15t/schema/types';
import { computed, type Ref } from 'vue';
import { useConsentActiveUI, useConsentInit, useCookie } from '#imports';

export type IabPreferenceTab = 'purposes' | 'vendors';

export interface ConsentIabSelection {
	purposeConsents: Record<number, boolean>;
	purposeLegitimateInterests: Record<number, boolean>;
	vendorConsents: Record<string, boolean>;
	vendorLegitimateInterests: Record<string, boolean>;
	specialFeatureOptIns: Record<number, boolean>;
	preferenceCenterTab: IabPreferenceTab;
}

export type IabConsentSaveInput = 'all' | 'none' | ConsentIabSelection;

const IAB_SELECTION_COOKIE = 'c15t:iab-selection';

export function createDefaultIabSelection(): ConsentIabSelection {
	return {
		purposeConsents: {},
		purposeLegitimateInterests: {},
		vendorConsents: {},
		vendorLegitimateInterests: {},
		specialFeatureOptIns: {},
		preferenceCenterTab: 'purposes',
	};
}

export function useConsentIabStore() {
	return useCookie<ConsentIabSelection>(IAB_SELECTION_COOKIE, {
		default: createDefaultIabSelection,
	});
}

export function useConsentIabSelection(): Ref<ConsentIabSelection> {
	const stored = useConsentIabStore();

	return computed({
		get: () => stored.value ?? createDefaultIabSelection(),
		set: (value) => {
			stored.value = value;
		},
	});
}

export function buildAcceptAllIab(
	gvlData: GlobalVendorList,
	vendors: NonIABVendor[],
	tab: IabPreferenceTab
): ConsentIabSelection {
	const purposeConsents: Record<number, boolean> = {};
	const purposeLegitimateInterests: Record<number, boolean> = {};
	for (const purposeId of Object.keys(gvlData.purposes)) {
		purposeConsents[Number(purposeId)] = true;
		purposeLegitimateInterests[Number(purposeId)] = true;
	}

	const vendorConsents: Record<string, boolean> = {};
	const vendorLegitimateInterests: Record<string, boolean> = {};
	for (const [vendorId, vendor] of Object.entries(gvlData.vendors)) {
		const id = String(vendorId);
		if (vendor.purposes && vendor.purposes.length > 0) {
			vendorConsents[id] = true;
		}
		if (vendor.legIntPurposes && vendor.legIntPurposes.length > 0) {
			vendorLegitimateInterests[id] = true;
		}
	}
	for (const vendor of vendors) {
		const id = String(vendor.id);
		if (vendor.purposes && vendor.purposes.length > 0) {
			vendorConsents[id] = true;
		}
		if (vendor.legIntPurposes && vendor.legIntPurposes.length > 0) {
			vendorLegitimateInterests[id] = true;
		}
	}

	const specialFeatureOptIns: Record<number, boolean> = {};
	for (const featureId of Object.keys(gvlData.specialFeatures ?? {})) {
		specialFeatureOptIns[Number(featureId)] = true;
	}

	return {
		purposeConsents,
		purposeLegitimateInterests,
		vendorConsents,
		vendorLegitimateInterests,
		specialFeatureOptIns,
		preferenceCenterTab: tab,
	};
}

export function buildRejectAllIab(
	gvlData: GlobalVendorList,
	vendors: NonIABVendor[],
	tab: IabPreferenceTab
): ConsentIabSelection {
	const purposeConsents: Record<number, boolean> = { 1: true };
	const purposeLegitimateInterests: Record<number, boolean> = {};
	for (const purposeId of Object.keys(gvlData.purposes)) {
		if (Number(purposeId) !== 1) {
			purposeConsents[Number(purposeId)] = false;
			purposeLegitimateInterests[Number(purposeId)] = false;
		}
	}

	const vendorConsents: Record<string, boolean> = {};
	const vendorLegitimateInterests: Record<string, boolean> = {};
	for (const [vendorId, vendor] of Object.entries(gvlData.vendors)) {
		const id = String(vendorId);
		if (vendor.purposes && vendor.purposes.length > 0) {
			vendorConsents[id] = false;
		}
		if (vendor.legIntPurposes && vendor.legIntPurposes.length > 0) {
			vendorLegitimateInterests[id] = false;
		}
	}
	for (const vendor of vendors) {
		const id = String(vendor.id);
		if (vendor.purposes && vendor.purposes.length > 0) {
			vendorConsents[id] = false;
		}
		if (vendor.legIntPurposes && vendor.legIntPurposes.length > 0) {
			vendorLegitimateInterests[id] = false;
		}
	}

	const specialFeatureOptIns: Record<number, boolean> = {};
	for (const featureId of Object.keys(gvlData.specialFeatures ?? {})) {
		specialFeatureOptIns[Number(featureId)] = false;
	}

	return {
		purposeConsents,
		purposeLegitimateInterests,
		vendorConsents,
		vendorLegitimateInterests,
		specialFeatureOptIns,
		preferenceCenterTab: tab,
	};
}

export function useConsentIabSave() {
	const activeUI = useConsentActiveUI();
	const init = useConsentInit();
	const selection = useConsentIabSelection();

	return (input: IabConsentSaveInput, tab?: IabPreferenceTab) => {
		const gvlData = init.value?.gvl;
		if (!gvlData) {
			return;
		}

		const customVendors = init.value?.customVendors ?? [];
		const resolvedTab = tab ?? selection.value.preferenceCenterTab;

		if (input === 'all') {
			selection.value = buildAcceptAllIab(gvlData, customVendors, resolvedTab);
		} else if (input === 'none') {
			selection.value = buildRejectAllIab(gvlData, customVendors, resolvedTab);
		} else {
			selection.value = {
				...input,
				preferenceCenterTab: tab ?? input.preferenceCenterTab,
			};
		}
		activeUI.value = null;
	};
}
