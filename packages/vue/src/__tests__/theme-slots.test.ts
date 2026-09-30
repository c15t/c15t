/**
 * `theme.slots` styles the stock parts in Vue too, through the same mapping
 * onto `components` the Astro Vue island used to apply itself.
 */
import type { InitOutput, PolicyRule } from '@c15t/schema/types';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { translations as enTranslations } from '@c15t/translations/en';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, expect, test, vi } from 'vitest';

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
	id: 'vue_slots_policy',
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

const part = (testId: string) =>
	document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

let mounted: { context: VueConsentKernelContext; wrapper: VueWrapper } | null =
	null;

afterEach(async () => {
	mounted?.wrapper.unmount();
	mounted?.context.dispose();
	mounted = null;
	await flushPromises();
	document.body.innerHTML = '';
});

test('puts slot classes and styles on the stock banner under components', async () => {
	const config = {
		backendURL: 'https://consent.example',
		components: {
			banner: {
				card: { class: 'app-card', style: { color: 'rgb(4, 5, 6)' } },
			},
		},
		customFetch: vi.fn(() => new Response('{}')) as unknown as typeof fetch,
		disableAnimation: true,
		hideBranding: true,
		theme: {
			slots: {
				consentBannerCard: {
					className: 'theme-card',
					style: { backgroundColor: 'rgb(1, 2, 3)', color: 'rgb(7, 8, 9)' },
				},
				consentBannerTitle: 'theme-title',
			},
		},
	} as ConsentConfig;
	const context = createVueConsentKernelContext({ config, prefetch: init });
	context.activeUI.value = 'banner';
	const wrapper = mount(ConsentBanner, {
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
	mounted = { context, wrapper };
	await flushPromises();
	await vi.waitFor(() => expect(part('consent-banner-card')).not.toBeNull());

	const card = part('consent-banner-card');
	expect(card?.classList).toContain('theme-card');
	expect(card?.classList).toContain('app-card');
	// `components` wins where both set a property.
	expect(card?.style.backgroundColor).toBe('rgb(1, 2, 3)');
	expect(card?.style.color).toBe('rgb(4, 5, 6)');
	expect(part('consent-banner-title')?.classList).toContain('theme-title');
});
