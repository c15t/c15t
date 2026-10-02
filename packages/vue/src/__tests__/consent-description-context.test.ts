/**
 * `ConsentDescription` picks its class by context. The manager's muted
 * colours live in the banner stylesheet (`.description[data-context='manager']`
 * in prompt.module.css), so only `context="dialog"` takes the dialog's class.
 */
import type { InitOutput, PolicyRule } from '@c15t/schema/types';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { translations } from '@c15t/translations/en';
import bannerStyles from '@c15t/ui/styles/components/consent-banner';
import dialogStyles from '@c15t/ui/styles/components/consent-dialog';
import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';

import ConsentDescription from '../runtime/components/description.vue';
import { consentConfigKey } from '../runtime/composables/config';
import type { ConsentConfig } from '../runtime/config';
import { createVueConsentKernelContext } from '../runtime/kernel';
import {
	symbolActiveUI,
	symbolConsent,
	symbolInit,
	symbolKernel,
	symbolKernelContext,
	symbolSnapshot,
} from '../runtime/utils/symbols';

const rule: PolicyRule = {
	categories: ['measurement'],
	id: 'vue_description_policy',
	match: { fallback: true },
	model: 'opt-in',
	prompt: 'choice',
	scopeMode: 'permissive',
};

const init = {
	branding: 'c15t',
	location: { countryCode: 'US', regionCode: 'CA' },
	policyResolution: writePolicyResolutionWire(
		resolvePolicyRules({ countryCode: null, regionCode: null, rules: [rule] })
	),
	translations: { language: 'en', translations },
} as InitOutput;

const renderDescription = function renderDescription(
	context: 'banner' | 'dialog' | 'manager'
) {
	const config = {
		backendURL: 'https://consent.example',
		consentCategories: ['necessary', 'measurement'],
		domain: 'consent.example',
	} as ConsentConfig;
	const kernelContext = createVueConsentKernelContext({
		config,
		prefetch: init,
	});
	return mount(ConsentDescription, {
		global: {
			provide: {
				[consentConfigKey as symbol]: config,
				[symbolKernelContext as symbol]: kernelContext,
				[symbolKernel as symbol]: kernelContext.kernel,
				[symbolSnapshot as symbol]: kernelContext.snapshot,
				[symbolInit as symbol]: kernelContext.init,
				[symbolActiveUI as symbol]: kernelContext.activeUI,
				[symbolConsent as symbol]: kernelContext.storedConsent,
			},
		},
		props: { context },
	});
};

test.each([
	['banner', bannerStyles.description],
	['dialog', dialogStyles.description],
	['manager', bannerStyles.description],
] as const)(
	'context="%s" takes the matching description class',
	(context, expected) => {
		const wrapper = renderDescription(context);
		const root = wrapper.get(`[data-context="${context}"]`);
		const other =
			expected === bannerStyles.description
				? dialogStyles.description
				: bannerStyles.description;

		expect(expected).toBeTruthy();
		expect(root.classes()).toContain(expected);
		expect(root.classes()).not.toContain(other);
		wrapper.unmount();
	}
);
