import { resolvePolicyRules } from '@c15t/schema/types';
import type { PolicyRule } from '@c15t/schema/types';
import { describe, expect, it } from 'vitest';

import {
	createConsentKernel,
	IAB_UNAVAILABLE_ERROR_CODE,
	IABUnavailableError,
	policyNeedsIAB,
} from '../index';
import { createOfflineTransport } from '../transports/offline';
import type { GlobalVendorList, KernelConfig } from '../types';

/** Only its presence matters here. */
const GVL = {
	purposes: {},
	vendorListVersion: 1,
	vendors: {},
} as unknown as GlobalVendorList;

const rule = (model: PolicyRule['model']): PolicyRule => ({
	categories: ['marketing'],
	id: `rule-${model}`,
	match: { fallback: true },
	model,
	prompt: 'choice',
	scopeMode: 'permissive',
});

const snapshot = (
	model: PolicyRule['model'],
	config: Partial<KernelConfig> = {}
) =>
	createConsentKernel({
		initialPolicyResolution: resolvePolicyRules({
			countryCode: null,
			regionCode: null,
			rules: [rule(model)],
		}),
		...config,
	}).getSnapshot();

describe('policyNeedsIAB', () => {
	it.each([
		['the vendor list', { cmpId: 28, enabled: true, gvl: GVL }],
		['the vendor list without IAB marked on', { enabled: false, gvl: GVL }],
		[
			'a reference to the vendor list',
			{
				enabled: true,
				gvl: null,
				gvlReference: { language: 'en', url: '/gvl', vendorListVersion: 1 },
			},
		],
	] as const)('is true for an `iab` policy with %s', (_label, initialIab) => {
		expect(
			policyNeedsIAB(snapshot('iab', { initialIab: initialIab as never }))
		).toBe(true);
	});

	it('is false when the backend turned IAB off with `gvl: null`', () => {
		expect(
			policyNeedsIAB(
				snapshot('iab', { initialIab: { enabled: false, gvl: null } })
			)
		).toBe(false);
	});

	it('is false for a policy that is not IAB', () => {
		expect(
			policyNeedsIAB(
				snapshot('opt-in', {
					initialIab: { cmpId: 28, enabled: true, gvl: GVL },
				})
			)
		).toBe(false);
	});

	it('is false while an external CMP owns consent', () => {
		expect(
			policyNeedsIAB(
				snapshot('iab', {
					initialExternalPermissions: { marketing: true, necessary: true },
					initialIab: { cmpId: 28, enabled: true, gvl: GVL },
				} as Partial<KernelConfig>)
			)
		).toBe(false);
	});

	it.each([
		['the recommended pack', undefined],
		['an `iab` rule', [rule('iab')]],
	] as const)(
		'is false for offline mode without IAB and %s',
		async (_label, policyRules) => {
			const kernel = createConsentKernel({
				transport: createOfflineTransport({
					policyRules: policyRules ? [...policyRules] : undefined,
				}),
			});
			await kernel.commands.init();

			// Offline mode sends no vendor list without IAB: the recommended
			// pack picks its non-IAB rule, and an `iab` rule fails to resolve.
			expect(kernel.getSnapshot().iab?.gvl ?? null).toBeNull();
			expect(policyNeedsIAB(kernel.getSnapshot())).toBe(false);
		}
	);
});

describe('IABUnavailableError', () => {
	it('says what is missing and how to fix it, with a stable code', () => {
		const error = new IABUnavailableError(
			'`iab` is not set',
			'Set the `iab` option'
		);

		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe('IABUnavailableError');
		expect(error.code).toBe(IAB_UNAVAILABLE_ERROR_CODE);
		expect(error.message).toBe(
			"c15t: this visitor's policy uses IAB TCF, but `iab` is not set. Set the `iab` option, or remove the IAB model from your policy."
		);
	});
});
