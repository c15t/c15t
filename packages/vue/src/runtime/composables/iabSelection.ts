import { getIABControls } from '@c15t/core';
import { computed } from 'vue';
import type { Ref } from 'vue';

import { useState as createVueState } from '#imports';

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

const setVueRefValue = function setVueRefValue<T>(target: Ref<T>, value: T) {
	target.value = value;
};

export const createDefaultIabSelection =
	function createDefaultIabSelection(): ConsentIabSelection {
		return {
			preferenceCenterTab: 'purposes',
			purposeConsents: {},
			purposeLegitimateInterests: {},
			specialFeatureOptIns: {},
			vendorConsents: {},
			vendorLegitimateInterests: {},
		};
	};

/** The preference centre tab, shared by every IAB surface on the page. */
const useIabPreferenceTab =
	function useIabPreferenceTab(): Ref<IabPreferenceTab> {
		return createVueState<IabPreferenceTab>(
			'c15t:iab-preference-tab',
			() => 'purposes'
		);
	};

export const useConsentIabStore = function useConsentIabStore() {
	const context = useConsentKernelContext();
	const tab = useIabPreferenceTab();

	return computed<ConsentIabSelection>({
		get: () => {
			const { iab } = context.snapshot.value;
			return {
				preferenceCenterTab: tab.value,
				purposeConsents: { ...(iab?.purposeConsents ?? {}) },
				purposeLegitimateInterests: {
					...(iab?.purposeLegitimateInterests ?? {}),
				},
				specialFeatureOptIns: { ...(iab?.specialFeatureOptIns ?? {}) },
				vendorConsents: { ...(iab?.vendorConsents ?? {}) },
				vendorLegitimateInterests: {
					...(iab?.vendorLegitimateInterests ?? {}),
				},
			};
		},
		set: (value) => {
			setVueRefValue(tab, value.preferenceCenterTab);
			context.kernel.set.iab({
				enabled: true,
				purposeConsents: value.purposeConsents,
				purposeLegitimateInterests: value.purposeLegitimateInterests,
				specialFeatureOptIns: value.specialFeatureOptIns,
				vendorConsents: value.vendorConsents,
				vendorLegitimateInterests: value.vendorLegitimateInterests,
			});
		},
	});
};

export const useConsentIabSelection =
	function useConsentIabSelection(): Ref<ConsentIabSelection> {
		const stored = useConsentIabStore();

		return computed({
			get: () => stored.value ?? createDefaultIabSelection(),
			set: (value) => {
				setVueRefValue(stored, value);
			},
		});
	};

/**
 * Save the visitor's IAB choice and encode its TC string.
 *
 * `'all'` and `'none'` go through the mounted CMP handle's `acceptAll()` /
 * `rejectAll()`, the same blanket React and Svelte apply, so every adapter
 * records the same purposes, vendors and special features. Without a
 * mounted handle there is no CMP to encode a TC string, so a blanket
 * records nothing.
 *
 * @returns A function that waits for the vendor list, applies `input` and
 * saves. It rejects when the list fails to load or the runtime's CMP handle
 * changes while it waits.
 */
export const useConsentIabSave = function useConsentIabSave() {
	const init = useConsentInit();
	const kernel = useConsentKernel();
	const selection = useConsentIabSelection();
	const preferenceTab = useIabPreferenceTab();
	const context = useConsentKernelContext();

	return async (input: IabConsentSaveInput, tab?: IabPreferenceTab) => {
		const controls = context.iab ?? getIABControls(kernel);
		await controls?.whenReady?.();
		if (controls !== (context.iab ?? getIABControls(kernel))) {
			throw new Error(
				'IAB action cancelled because the consent runtime changed.'
			);
		}

		if (input === 'all' || input === 'none') {
			if (!controls) {
				return;
			}
			if (tab) {
				setVueRefValue(preferenceTab, tab);
			}
			if (input === 'all') {
				controls.acceptAll();
			} else {
				controls.rejectAll();
			}
			await controls.save();
			return;
		}

		if (!init.value?.gvl) {
			return;
		}
		setVueRefValue(selection, {
			...input,
			preferenceCenterTab: tab ?? input.preferenceCenterTab,
		});
		if (controls) {
			await controls.save();
		} else {
			await kernel.commands.save();
		}
	};
};
