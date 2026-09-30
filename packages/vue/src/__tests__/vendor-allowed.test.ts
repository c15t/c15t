/**
 * `useVendorAllowed` in Vue: a declared vendor follows its category and the
 * visitor's vendor switch, and an id nothing declares reads as not allowed.
 */
import type { AllConsentNames } from '@c15t/core';
import type { PolicyResolution, PolicyRule } from '@c15t/schema/types';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
} from '@c15t/schema/types';
import { afterEach, expect, test, vi } from 'vitest';
import { createApp, defineComponent, h } from 'vue';
import type { ComputedRef } from 'vue';

import { useVendorAllowed } from '../runtime/composables/consent';
import { createVueConsentKernelContext } from '../runtime/kernel';
import { symbolKernelContext } from '../runtime/utils/symbols';

const resolution = (patch: Partial<PolicyRule> = {}): PolicyResolution => {
	const policy = normalizePolicyRule({
		categories: ['measurement', 'marketing'],
		id: 'vue-vendor-allowed',
		match: { fallback: true },
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: 'permissive',
		...patch,
	});
	return {
		fingerprints: createPolicyRuleFingerprints(policy),
		matchedBy: 'fallback',
		policy,
		policyId: policy.id,
		status: 'matched',
	};
};

const DECLARED: AllConsentNames[] = ['marketing', 'measurement'];

afterEach(() => vi.restoreAllMocks());

test('useVendorAllowed follows a declared vendor and reads an undeclared one as not allowed', async () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	const context = createVueConsentKernelContext({
		config: {
			consentCategories: DECLARED,
			vendors: [
				{
					category: 'marketing',
					id: 'x-pixel',
					name: 'X Pixel',
					privacyPolicyUrl: 'https://x.com/privacy',
				},
			],
		},
		kernelConfig: { initialPolicyResolution: resolution() },
	});
	let pixel!: ComputedRef<boolean>;
	let typo!: ComputedRef<boolean>;
	const app = createApp(
		defineComponent({
			setup() {
				pixel = useVendorAllowed('x-pixel');
				typo = useVendorAllowed('x-pixle');
				return () => h('div');
			},
		})
	);
	app.provide(symbolKernelContext, context);
	app.mount(document.createElement('div'));
	try {
		expect(pixel.value).toBe(false);
		await context.kernel.commands.save('all');
		expect(pixel.value).toBe(true);
		// The category is granted, but nothing declares the misspelled id.
		expect(typo.value).toBe(false);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('"x-pixle" is not declared')
		);
		await context.kernel.commands.save(
			{ marketing: true, measurement: true, necessary: true },
			{ vendors: { 'x-pixel': false } }
		);
		expect(pixel.value).toBe(false);
	} finally {
		app.unmount();
		context.dispose();
	}
});
