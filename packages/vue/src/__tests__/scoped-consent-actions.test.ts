import { createConsentKernel } from '@c15t/core/v3';
import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import { defineComponent, h, ref } from 'vue';

import { consentConfigKey } from '../runtime/composables/config';
import { useConsentSave } from '../runtime/composables/consent';
import { symbolInit, symbolKernel } from '../runtime/utils/symbols';

describe('displayed consent actions', () => {
	test.each(['all', 'none'] as const)(
		'%s preserves categories hidden by config',
		(action) => {
			const kernel = createConsentKernel({
				initialConsents: {
					experience: true,
					functionality: false,
					marketing: true,
					measurement: true,
				},
			});
			const Control = defineComponent({
				setup() {
					const save = useConsentSave();
					return () => h('button', { onClick: () => save(action) }, action);
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
			expect(kernel.getSnapshot().consents).toEqual({
				experience: true,
				functionality: false,
				marketing: true,
				measurement: action === 'all',
				necessary: true,
			});
			wrapper.unmount();
		}
	);
});
