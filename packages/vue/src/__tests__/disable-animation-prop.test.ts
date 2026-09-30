import type { InitOutput, PolicyRule } from '@c15t/schema/types';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { translations as enTranslations } from '@c15t/translations/en';
import bannerStyles from '@c15t/ui/styles/components/consent-banner';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { Component, ComponentPublicInstance } from 'vue';

import ConsentManager from '../runtime/components/manager.vue';
import ConsentBanner from '../runtime/components/prompt.vue';
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

const rule: PolicyRule = {
	categories: ['measurement', 'marketing'],
	id: 'vue_motion_policy',
	match: { fallback: true },
	model: 'opt-in',
	prompt: 'choice',
	scopeMode: 'permissive',
};

const init = {
	branding: 'c15t',
	jurisdiction: 'GDPR',
	location: { countryCode: 'DE', regionCode: null },
	policyResolution: writePolicyResolutionWire(
		resolvePolicyRules({ countryCode: null, regionCode: null, rules: [rule] })
	),
	translations: { language: 'en', translations: enTranslations },
} as InitOutput;

let mounted: {
	context: VueConsentKernelContext;
	wrapper: VueWrapper<ComponentPublicInstance>;
} | null = null;

const query = (selector: string) =>
	document.querySelector<HTMLElement>(selector);

const render = async function render(
	component: Component,
	activeUI: 'banner' | 'manager',
	configDisableAnimation: boolean,
	disableAnimation: boolean | undefined
) {
	const config = {
		backendURL: 'https://consent.example',
		consentCategories: ['necessary', 'measurement', 'marketing'],
		customFetch: vi.fn(() => new Response('{}')) as unknown as typeof fetch,
		disableAnimation: configDisableAnimation,
		hideBranding: true,
	} as ConsentConfig;
	const context = createVueConsentKernelContext({ config, prefetch: init });
	context.activeUI.value = activeUI;
	const wrapper = mount(component, {
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
		props: disableAnimation === undefined ? {} : { disableAnimation },
	});
	mounted = { context, wrapper };
	await flushPromises();
};

afterEach(async () => {
	if (mounted) {
		const { element } = mounted.wrapper;
		mounted.wrapper.unmount();
		element.remove();
		mounted.context.dispose();
		mounted = null;
		await flushPromises();
	}
	document.body.innerHTML = '';
	vi.restoreAllMocks();
});

describe('the disableAnimation prop', () => {
	const entering = bannerStyles.bannerEntering ?? 'bannerEntering';
	const bannerRoot = () => query('[data-testid="consent-banner-root"]');

	test.each([
		{ config: false, expected: false, prop: undefined },
		{ config: false, expected: true, prop: true },
		{ config: true, expected: false, prop: false },
	])(
		'on ConsentBanner: $prop over config $config skips the entry: $expected',
		async ({ config, expected, prop }) => {
			await render(ConsentBanner, 'banner', config, prop);
			await vi.waitFor(() => expect(bannerRoot()).not.toBeNull());
			expect(bannerRoot()?.classList.contains(entering)).toBe(!expected);
		}
	);

	test.each([
		{ config: false, expected: true, prop: true },
		{ config: true, expected: false, prop: false },
	])(
		'on ConsentDialog: $prop over config $config marks the dialog: $expected',
		async ({ config, expected, prop }) => {
			await render(ConsentManager, 'manager', config, prop);
			const positioner = () => query('[data-slot="dialog-positioner"]');
			await vi.waitFor(() => expect(positioner()).not.toBeNull());
			expect(positioner()?.hasAttribute('data-disable-animation')).toBe(
				expected
			);
		}
	);
});
