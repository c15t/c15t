import type { PolicyRule } from '@c15t/schema/types';
import { resolvePolicyRules } from '@c15t/schema/types';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, test } from 'vitest';
import type { Component, ComponentPublicInstance } from 'vue';
import { h } from 'vue';

import { translations as de } from '../../../translations/src/translations/de';
import ConsentDialogLink from '../runtime/components/consent-dialog-link.vue';
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
import type { VueConsentKernelContext } from './test-kernel';

const choiceRule: PolicyRule = {
	id: 'vue_translated_surfaces',
	match: { fallback: true, isDefault: true },
	model: 'opt-in',
	prompt: 'choice',
};

let mounted: {
	context: VueConsentKernelContext;
	wrapper: VueWrapper<ComponentPublicInstance>;
} | null = null;

/** Mount a surface with the copy the init response carried, if any. */
const renderSurface = async function renderSurface(
	surface: () => ReturnType<typeof h>,
	language?: 'de'
) {
	const config = {
		consentCategories: ['necessary', 'marketing'],
	} as ConsentConfig;
	const context = createVueConsentKernelContext({
		config,
		kernelConfig: {
			initialLocation: { countryCode: 'DE', regionCode: null },
			initialPolicyResolution: resolvePolicyRules({
				countryCode: 'DE',
				regionCode: null,
				rules: [choiceRule],
			}),
			initialTranslations: language
				? { language, translations: de }
				: undefined,
			transport: {
				init: () => Promise.resolve({}),
				save: () => Promise.resolve({ ok: true, subjectId: 'vue-copy' }),
			},
		},
	});
	const wrapper = mount({ render: surface } as Component, {
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
	mounted = { context, wrapper };
	return wrapper;
};

afterEach(() => {
	if (mounted) {
		mounted.wrapper.unmount();
		mounted.context.dispose();
		mounted = null;
	}
	document.body.innerHTML = '';
});

describe('default surface copy comes from translations', () => {
	test('ConsentDialogLink labels itself with the dialog title', async () => {
		const wrapper = await renderSurface(() => h(ConsentDialogLink), 'de');
		expect(wrapper.get('[data-testid="consent-dialog-link"]').text()).toBe(
			de.consentManagerDialog.title
		);
	});

	test('ConsentDialogLink falls back to English before copy arrives', async () => {
		const wrapper = await renderSurface(() => h(ConsentDialogLink));
		expect(wrapper.get('[data-testid="consent-dialog-link"]').text()).toBe(
			'Privacy Settings'
		);
	});
});
