/**
 * Vue's IAB controls must write the legal basis a publisher restriction
 * leaves. The events they emit are applied to a real `createIAB` handle the
 * way `iab-panel.vue` wires them, then saved, so each case ends at the gate.
 *
 * @vitest-environment jsdom
 */
import { createConsentKernel, evaluateConsent } from '@c15t/core';
import type { ConsentKernel } from '@c15t/core';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
} from '@c15t/schema/types';
import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, test } from 'vitest';
import { ref } from 'vue';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import { createIAB } from '../../../iab/src/index';
import type { IABHandle } from '../../../iab/src/index';
import IabPurposeItem from '../runtime/components/iab-purpose-item.vue';
import IabVendorList from '../runtime/components/iab-vendor-list.vue';
import { symbolInit } from '../runtime/utils/symbols';

// Vendor 755 must use legitimate interest for purpose 7.
const publisherRestrictions = [
	{ purposeId: 7, restrictionType: 2 as const, vendorIds: [755] },
];
// Only the IAB gate decides: `necessary` has no category restriction.
const target = {
	category: 'necessary' as const,
	iabLegIntPurposes: [7],
	vendorId: 755,
};
const global = { provide: { [symbolInit]: ref(undefined) } };
const disposers: (() => void)[] = [];

afterEach(() => {
	for (const dispose of disposers.splice(0)) {
		dispose();
	}
	localStorage.clear();
});

const setup = async (): Promise<{
	handle: IABHandle;
	kernel: ConsentKernel;
}> => {
	const policy = normalizePolicyRule({
		id: 'iab-vue',
		match: { isDefault: true },
		model: 'iab',
		prompt: 'choice',
	});
	const kernel = createConsentKernel({
		initialIab: { cmpId: 28, enabled: true, gvl: completeGVL },
		initialPolicyResolution: {
			fingerprints: createPolicyRuleFingerprints(policy),
			matchedBy: 'default',
			policy,
			policyId: policy.id,
			status: 'matched',
		},
	});
	const handle = createIAB({
		cmpId: 28,
		gvl: completeGVL,
		kernel,
		persistence: false,
		publisherRestrictions,
	});
	disposers.push(handle.dispose, kernel.dispose);
	await handle.whenReady();
	return { handle, kernel };
};

/** Apply emitted events the way `iab-panel.vue` wires them. */
const applyEmitted = (wrapper: VueWrapper, handle: IABHandle): void => {
	const emitted = wrapper.emitted();
	for (const [id, value] of (emitted.vendorToggle ?? []) as [
		number,
		boolean,
	][]) {
		handle.setVendorConsent(id, value);
	}
	for (const [id, value] of (emitted.vendorLegitimateInterestToggle ?? []) as [
		number,
		boolean,
	][]) {
		handle.setVendorLegitimateInterest(id, value);
	}
	for (const [value] of (emitted.purposeLegitimateInterestToggle ?? []) as [
		boolean,
	][]) {
		handle.setPurposeLegitimateInterest(7, value);
	}
};

describe('Vue controls under a legitimate-interest restriction', () => {
	test('allowing the purpose objection grants the vendor LI signal', async () => {
		const { handle, kernel } = await setup();
		const wrapper = mount(IabPurposeItem, {
			global,
			props: {
				isEnabled: false,
				purpose: {
					description: '',
					hasConsentBasis: false,
					id: 7,
					illustrations: [],
					name: 'Measure advertising performance',
					vendors: [
						{ id: 755, name: 'Vendor 755', usesLegitimateInterest: true },
					],
				},
				// The visitor had objected; the only control lifts the objection.
				purposeLegitimateInterests: { 7: false },
				vendorConsents: {},
				vendorLegitimateInterests: { 755: false },
			},
		});
		await wrapper.get('button[aria-pressed]').trigger('click');
		applyEmitted(wrapper, handle);
		await handle.save();
		expect(evaluateConsent(target, kernel.getSnapshot())).toBe(true);
	});

	test('the vendor tab offers the objection a restricted vendor needs', async () => {
		const { handle, kernel } = await setup();
		const { 755: vendor755 } = completeGVL.vendors;
		if (!vendor755) {
			throw new Error('Missing vendor 755 fixture');
		}
		// The list the panel passes after restrictions: 7 is now LI.
		const restricted = {
			...completeGVL,
			vendors: {
				755: {
					...vendor755,
					legIntPurposes: [7],
					purposes: vendor755.purposes.filter((id) => id !== 7),
				},
			},
		};
		const wrapper = mount(IabVendorList, {
			global,
			props: {
				purposes: [],
				selectedVendorId: null,
				vendorConsents: {},
				vendorData: restricted,
				vendorLegitimateInterests: { 755: false },
			},
		});
		await wrapper.get('#vendor-755 button[aria-pressed]').trigger('click');
		handle.setPurposeLegitimateInterest(7, true);
		applyEmitted(wrapper, handle);
		await handle.save();
		expect(evaluateConsent(target, kernel.getSnapshot())).toBe(true);
	});

	test('a vendor with no consent purposes has no consent switch', () => {
		const { 10: vendor10 } = completeGVL.vendors;
		if (!vendor10) {
			throw new Error('Missing vendor 10 fixture');
		}
		const wrapper = mount(IabVendorList, {
			global,
			props: {
				purposes: [],
				selectedVendorId: null,
				vendorConsents: {},
				vendorData: {
					...completeGVL,
					vendors: { 10: { ...vendor10, purposes: [] } },
				},
			},
		});
		expect(wrapper.findAll('#vendor-10 [role="switch"]')).toHaveLength(0);
		expect(wrapper.findAll('#vendor-10 button[aria-pressed]')).toHaveLength(1);
	});
});
