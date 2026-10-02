import {
	normalizePolicyRule,
	createPolicyRuleFingerprints,
} from '@c15t/schema/types';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import { defineComponent, h } from 'vue';

import ConsentWidget from '../runtime/components/preferences.vue';
import ConsentBanner from '../runtime/components/prompt.vue';
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

describe('Vue exemption preferences', () => {
	test('separates a statistics objection from advertising consent', async () => {
		const config: ConsentConfig = {
			backendURL: 'https://consent.example',
			consentCategories: ['necessary', 'measurement', 'marketing'],
			disableAnimation: true,
		};
		const policy = normalizePolicyRule({
			categories: ['measurement', 'marketing'],
			exemptions: {
				measurement: { kind: 'uk-statistics', revision: 'review-1' },
			},
			id: 'vue-uk-mixed',
			match: { countries: ['GB'] },
			model: 'opt-in',
			prompt: 'choice',
			scopeMode: 'strict',
		});
		const context = createVueConsentKernelContext({
			config,
			kernelConfig: {
				initialPolicyPending: false,
				initialPolicyResolution: {
					fingerprints: createPolicyRuleFingerprints(policy),
					matchedBy: 'country',
					policy,
					policyId: policy.id,
					status: 'matched',
				},
				transport: { save: () => Promise.resolve({ ok: true }) },
			},
		});
		const wrapper = mount(
			defineComponent({
				render: () => h('div', [h(ConsentWidget), h(ConsentBanner)]),
			}),
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
		try {
			await flushPromises();
			expect(
				document.querySelector(
					'[data-testid="consent-banner-exemption-notice"]'
				)?.textContent
			).toContain(
				'We use service statistics to improve this service without asking for consent.'
			);
			const measurement = wrapper.get(
				'[data-testid="consent-widget-switch-measurement"]'
			);
			const marketing = wrapper.get(
				'[data-testid="consent-widget-switch-marketing"]'
			);
			expect(measurement.attributes('aria-checked')).toBe('true');
			expect(marketing.attributes('aria-checked')).toBe('false');
			expect(
				wrapper
					.get('[data-testid="consent-widget-processing-measurement"]')
					.text()
			).toContain('You can turn this off at any time.');
			expect(
				wrapper
					.get('[data-testid="consent-widget-processing-marketing"]')
					.text()
			).toContain('Requires your consent.');
			await measurement.trigger('click');
			await marketing.trigger('click');
			expect(
				context.kernel.getSnapshot().effectivePermissions.measurement
			).toBe(true);
			expect(context.kernel.getSnapshot().effectivePermissions.marketing).toBe(
				false
			);
			await wrapper
				.get('[data-testid="consent-widget-footer-save-button"]')
				.trigger('click');
			await flushPromises();
			expect(
				context.kernel.getSnapshot().exemptionPreferences?.categories
					.measurement?.value
			).toBe(false);
			expect(
				context.kernel.getSnapshot().explicitChoice?.categories.marketing?.value
			).toBe(true);
			expect(
				context.kernel.getSnapshot().explicitChoice?.categories.measurement
			).toBeUndefined();
		} finally {
			const { element } = wrapper;
			wrapper.unmount();
			element.remove();
			context.dispose();
		}
	});
});
