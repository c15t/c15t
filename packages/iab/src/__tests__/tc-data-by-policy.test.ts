/** @vitest-environment jsdom */
/**
 * `__tcfapi` answers by the visitor's policy: full TC data when it uses IAB
 * TCF, only the base fields when it does not.
 */
import { createConsentKernel } from '@c15t/core';
import type { ConsentKernel } from '@c15t/core';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
} from '@c15t/schema/types';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { createIAB } from '../index';
import type { IABHandle } from '../index';
import type { TCData, TCDataOutsideTCF } from '../tcf/iab-tcf-types';
import { completeGVL } from './fixtures/gvl-sample';

const NOW = () => Date.parse('2026-10-14T12:00:00Z');
const disposers: (() => void)[] = [];

beforeEach(() => {
	localStorage.clear();
	for (const cookie of document.cookie.split(';')) {
		const name = cookie.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; max-age=0; path=/`;
		}
	}
});
afterEach(() => {
	for (const dispose of disposers.splice(0)) {
		dispose();
	}
});

const mount = async function mount(
	model: 'iab' | 'opt-in'
): Promise<{ addon: IABHandle; kernel: ConsentKernel }> {
	const policy = normalizePolicyRule({
		id: `${model}-policy`,
		match: { isDefault: true },
		model,
		prompt: 'choice',
		validity: { choiceDays: 30 },
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
		now: NOW,
	});
	disposers.push(kernel.dispose);
	const addon = createIAB({ cmpId: 28, gvl: completeGVL, kernel });
	disposers.push(addon.dispose);
	await addon.whenReady();
	return { addon, kernel };
};

const tcData = () =>
	new Promise<TCData | TCDataOutsideTCF>((resolve) => {
		window.__tcfapi?.('getTCData', 2, (data) =>
			resolve(data as TCData | TCDataOutsideTCF)
		);
	});

test('an IAB policy gets full TC data while the banner shows and after Accept All', async () => {
	const { addon, kernel } = await mount('iab');
	kernel.set.activeUI('banner');
	expect(kernel.getSnapshot().model).toBe('iab');

	const shown = await new Promise<TCData | TCDataOutsideTCF>((resolve) => {
		window.__tcfapi?.('addEventListener', 2, (data) =>
			resolve(data as TCData | TCDataOutsideTCF)
		);
	});
	expect(shown).toMatchObject({
		cmpId: 28,
		eventStatus: 'cmpuishown',
		gdprApplies: true,
		tcString: '',
	});

	addon.acceptAll();
	await addon.save();
	const saved = await tcData();
	if (!saved.gdprApplies) {
		throw new Error('expected full TC data for an IAB policy');
	}
	expect(saved.tcString).not.toBe('');
	expect(saved.purpose.consents[1]).toBe(true);
	expect(Object.values(saved.vendor.consents)).toContain(true);
	expect(saved.publisher).toBeDefined();
	expect(saved.isServiceSpecific).toBe(true);
});

test('a policy without IAB gets only the base fields', async () => {
	const { kernel } = await mount('opt-in');
	expect(kernel.getSnapshot().model).toBe('opt-in');
	const data = await tcData();
	expect(data).toEqual({
		cmpId: 28,
		cmpStatus: 'loaded',
		cmpVersion: expect.any(Number),
		gdprApplies: false,
		tcfPolicyVersion: completeGVL.tcfPolicyVersion,
	});
});
