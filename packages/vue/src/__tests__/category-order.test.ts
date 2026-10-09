/**
 * The Vue widget lists categories in the draft's order: necessary,
 * functionality, measurement, experience, marketing. Neither the policy nor
 * the configured list sets the order, so the rows match React's, which the
 * parity suite compares.
 */
import type { InitOutput, PolicyRule } from '@c15t/schema/types';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { flushPromises, mount } from '@vue/test-utils';
import { expect, test } from 'vitest';

import ConsentWidget from '../runtime/components/preferences.vue';
import { consentConfigKey } from '../runtime/composables/config';
import type { ConsentConfig } from '../runtime/config';
import {
	symbolActiveUI,
	symbolConsent,
	symbolInit,
	symbolKernel,
	symbolKernelContext,
	symbolSnapshot,
} from '../runtime/utils/symbols';
import { createVueConsentKernelContext } from './test-kernel';

const ITEM_PREFIX = 'consent-widget-accordion-item-';

const rule: PolicyRule = {
	categories: ['marketing', 'measurement', 'functionality', 'experience'],
	id: 'vue_category_order',
	match: { fallback: true },
	model: 'opt-in',
	prompt: 'choice',
	scopeMode: 'permissive',
};

const init: InitOutput = {
	branding: 'c15t',
	location: { countryCode: 'DE', regionCode: null },
	policyResolution: writePolicyResolutionWire(
		resolvePolicyRules({ countryCode: null, regionCode: null, rules: [rule] })
	),
	translations: {
		language: 'en',
		translations: {
			common: {},
			consentManagerDialog: {},
			consentTypes: {},
			cookieBanner: {},
		},
	},
};

test('the widget lists categories in the draft order, not the policy or configured order', async () => {
	const config = {
		backendURL: 'https://consent.example',
		consentCategories: [
			'marketing',
			'experience',
			'necessary',
			'measurement',
			'functionality',
		],
		disableAnimation: true,
	} as ConsentConfig;
	const context = createVueConsentKernelContext({
		config,
		prefetch: init,
		producerContract: 1,
	});
	const wrapper = mount(ConsentWidget, {
		attachTo: document.body,
		global: {
			provide: {
				[consentConfigKey as symbol]: config,
				[symbolKernelContext as symbol]: context,
				[symbolKernel as symbol]: context.kernel,
				[symbolSnapshot as symbol]: context.snapshot,
				[symbolInit as symbol]: context.init,
				[symbolActiveUI as symbol]: context.activeUI,
				[symbolConsent as symbol]: context.storedConsent,
			},
		},
	});
	await flushPromises();
	try {
		const rows = [
			...document.querySelectorAll<HTMLElement>(
				`[data-testid^="${ITEM_PREFIX}"]`
			),
		].map((item) => item.dataset.testid?.slice(ITEM_PREFIX.length));
		expect(rows).toEqual([
			'necessary',
			'functionality',
			'measurement',
			'experience',
			'marketing',
		]);
	} finally {
		const { element } = wrapper;
		wrapper.unmount();
		element.remove();
		context.dispose();
		await flushPromises();
	}
});
