import { createConsentKernel } from '@c15t/core';
import {
	normalizePolicyRule,
	createPolicyRuleFingerprints,
} from '@c15t/schema/types';
import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import { defineComponent, h, ref } from 'vue';

import { consentConfigKey } from '../runtime/composables/config';
import { useConsentSave } from '../runtime/composables/consent';
import { symbolInit, symbolKernel } from '../runtime/utils/symbols';

describe('displayed consent actions', () => {
	test.each(['all', 'none'] as const)(
		'%s preserves categories hidden by config',
		async (action) => {
			const policy = normalizePolicyRule({
				id: 'displayed-scope',
				match: { fallback: true },
				model: 'opt-in',
				prompt: 'choice',
			});
			const kernel = createConsentKernel({
				initialPolicyResolution: {
					fingerprints: createPolicyRuleFingerprints(policy),
					matchedBy: 'fallback',
					policy,
					policyId: policy.id,
					status: 'matched',
				},
			});
			await kernel.commands.save(
				{
					experience: true,
					functionality: false,
					marketing: true,
					measurement: true,
				},
				{ actionAt: Date.now() - 1000 }
			);
			const before = kernel.getSnapshot().explicitChoice;
			let saved: ReturnType<typeof kernel.commands.save> | undefined;
			const Control = defineComponent({
				setup() {
					const save = useConsentSave();
					return () =>
						h(
							'button',
							{
								onClick: () => {
									saved = save(action);
								},
							},
							action
						);
				},
			});
			const wrapper = mount(Control, {
				global: {
					provide: {
						[consentConfigKey]: {
							consentCategories: ['necessary', 'measurement'],
						},
						[symbolKernel]: kernel,
						[symbolInit]: ref(undefined),
					},
				},
			});
			wrapper.get('button').element.click();
			await saved;
			const categories = kernel.getSnapshot().explicitChoice?.categories;
			expect(categories?.measurement?.value).toBe(action === 'all');
			for (const hidden of [
				'experience',
				'functionality',
				'marketing',
			] as const) {
				expect(categories?.[hidden]).toEqual(before?.categories[hidden]);
			}
			wrapper.unmount();
		}
	);
});
