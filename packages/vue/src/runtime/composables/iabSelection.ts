import type { GlobalVendorList, NonIABVendor } from '@c15t/schema/types';
import { computed, type Ref } from 'vue';
import { useState } from '#imports';
// Imported from the sibling module (not `#imports`) to avoid a circular
// evaluation through the plain-Vue `#imports` shim, which re-exports this
// file: `iabSelection -> #imports -> composables/index -> iabSelection`.
import { useConsentInit } from './init';
import { useConsentKernel, useConsentKernelContext } from './kernel';

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
	const context = useConsentKernelContext();
	const tab = useState<IabPreferenceTab>(
		'c15t:iab-preference-tab',
		() => 'purposes'
	);

	return computed<ConsentIabSelection>({
		get: () => {
			const iab = context.snapshot.value.iab;
			return {
				purposeConsents: { ...(iab?.purposeConsents ?? {}) },
				purposeLegitimateInterests: {
					...(iab?.purposeLegitimateInterests ?? {}),
				},
				vendorConsents: { ...(iab?.vendorConsents ?? {}) },
				vendorLegitimateInterests: {
					...(iab?.vendorLegitimateInterests ?? {}),
				},
				specialFeatureOptIns: { ...(iab?.specialFeatureOptIns ?? {}) },
				preferenceCenterTab: tab.value,
			};
		},
		set: (value) => {
			tab.value = value.preferenceCenterTab;
			context.kernel.set.iab({
				enabled: true,
				purposeConsents: value.purposeConsents,
				purposeLegitimateInterests: value.purposeLegitimateInterests,
				vendorConsents: value.vendorConsents,
				vendorLegitimateInterests: value.vendorLegitimateInterests,
				specialFeatureOptIns: value.specialFeatureOptIns,
			});
		},
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
	const init = useConsentInit();
	const kernel = useConsentKernel();
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
		void kernel.commands.save();
	};
}
