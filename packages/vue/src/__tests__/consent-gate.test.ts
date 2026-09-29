import type { AllConsentNames } from '@c15t/core';
import type { PolicyRule } from '@c15t/schema/types';
import { resolvePolicyRules } from '@c15t/schema/types';
import frameStyles from '@c15t/ui/styles/components/frame';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, test } from 'vitest';
import type { Component, ComponentPublicInstance, VNode } from 'vue';
import { h } from 'vue';

import { translations as de } from '../../../translations/src/translations/de';
import ConsentGate from '../runtime/components/consent-gate.vue';
import { consentConfigKey } from '../runtime/composables/config';
import type { ConsentConfig } from '../runtime/config';
import { createVueConsentKernelContext } from '../runtime/kernel';
import type { VueConsentKernelContext } from '../runtime/kernel';
import {
	symbolActiveUI,
	symbolConsent,
	symbolInit,
	symbolKernel,
	symbolKernelContext,
	symbolSnapshot,
} from '../runtime/utils/symbols';

let mounted: {
	context: VueConsentKernelContext;
	wrapper: VueWrapper<ComponentPublicInstance>;
} | null = null;

/** Mount a gate for `category` under an opt-in rule. */
const renderGate = async function renderGate(options: {
	category: AllConsentNames;
	language?: 'de';
	slots?: Record<string, () => VNode>;
	strict?: boolean;
}) {
	const rule: PolicyRule = {
		categories: options.strict ? ['measurement'] : ['marketing'],
		id: 'vue_gate',
		match: { fallback: true, isDefault: true },
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: options.strict ? 'strict' : 'permissive',
	};
	const config = { consentCategories: ['necessary'] } as ConsentConfig;
	const context = createVueConsentKernelContext({
		config,
		kernelConfig: {
			initialLocation: { countryCode: 'DE', regionCode: null },
			initialPolicyResolution: resolvePolicyRules({
				countryCode: 'DE',
				regionCode: null,
				rules: [rule],
			}),
			initialTranslations: options.language
				? { language: options.language, translations: de }
				: undefined,
			transport: {
				init: () => Promise.resolve({}),
				save: () => Promise.resolve({ ok: true, subjectId: 'vue-gate' }),
			},
		},
	});
	const wrapper = mount(
		{
			render: () =>
				h(ConsentGate, { category: options.category }, options.slots ?? {}),
		} as Component,
		{
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
		}
	);
	await flushPromises();
	mounted = { context, wrapper };
	return { context, wrapper };
};

afterEach(() => {
	if (mounted) {
		mounted.wrapper.unmount();
		mounted.context.dispose();
		mounted = null;
	}
	document.body.innerHTML = '';
});

describe('ConsentGate default placeholder', () => {
	test('renders the frame placeholder with a title and an enable button', async () => {
		const { wrapper } = await renderGate({ category: 'marketing' });
		const placeholder = wrapper.get('[data-testid="frame-placeholder"]');
		expect(placeholder.classes()).toContain(frameStyles.placeholder);
		expect(placeholder.get(`.${frameStyles.title}`).text()).toBe(
			'Accept Marketing consent to view this content.'
		);
		expect(wrapper.get('[data-testid="frame-open-dialog"]').text()).toBe(
			'Enable Marketing consent'
		);
	});

	test('uses the visitor language', async () => {
		const { wrapper } = await renderGate({
			category: 'marketing',
			language: 'de',
		});
		const marketing = de.consentTypes.marketing.title;
		expect(wrapper.get(`.${frameStyles.title}`).text()).toBe(
			de.frame.title.replace('{category}', marketing)
		);
		expect(wrapper.get('[data-testid="frame-open-dialog"]').text()).toBe(
			de.frame.actionButton.replace('{category}', marketing)
		);
	});

	test('the button opens the preferences and registers the category', async () => {
		const { context, wrapper } = await renderGate({ category: 'marketing' });
		expect(context.snapshot.value.consentCategories).toContain('marketing');

		await wrapper.get('[data-testid="frame-open-dialog"]').trigger('click');

		expect(context.activeUI.value).toBe('manager');
		// Opening the preferences grants nothing by itself.
		expect(context.snapshot.value.effectivePermissions.marketing).toBe(false);
	});

	test('a strict policy without the category says so and offers no button', async () => {
		const { wrapper } = await renderGate({
			category: 'marketing',
			strict: true,
		});
		expect(wrapper.get(`.${frameStyles.title}`).text()).toBe(
			"This content is unavailable under your region's consent policy."
		);
		expect(wrapper.find('[data-testid="frame-open-dialog"]').exists()).toBe(
			false
		);
	});

	test('the placeholder slot replaces the default', async () => {
		const { wrapper } = await renderGate({
			category: 'marketing',
			slots: { placeholder: () => h('p', 'Custom placeholder') },
		});
		expect(wrapper.text()).toBe('Custom placeholder');
		expect(wrapper.find('[data-testid="frame-placeholder"]').exists()).toBe(
			false
		);
	});
});
