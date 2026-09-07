import type { InitOutput, PolicyRule } from '@c15t/schema/types';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { translations as enTranslations } from '@c15t/translations/en';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { ComponentPublicInstance } from 'vue';

import ConsentBanner from '../runtime/components/consent-banner.vue';
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

const translations = {
	...enTranslations,
	common: { ...enTranslations.common, dismiss: 'Got it' },
	cookieBanner: {
		description: 'Choice description',
		noticeDescription: 'Notice description',
		noticeTitle: 'Notice title',
		title: 'Choice title',
	},
	rights: {
		optOut: 'Do not sell my info',
		preferences: 'Manage my preferences',
	},
};

const noticeRule: PolicyRule = {
	categories: ['measurement', 'marketing'],
	id: 'vue_notice_policy',
	match: { fallback: true },
	model: 'opt-out',
	prompt: 'notice',
	scopeMode: 'permissive',
};

const choiceRule: PolicyRule = {
	categories: ['measurement', 'marketing'],
	id: 'vue_choice_policy',
	match: { fallback: true },
	model: 'opt-in',
	prompt: 'choice',
	scopeMode: 'permissive',
};

const buildInit = function buildInit(
	rule: PolicyRule,
	bundle: typeof translations = translations
): InitOutput {
	return {
		branding: 'c15t',
		jurisdiction: 'GDPR',
		location: { countryCode: 'US', regionCode: 'CA' },
		policyResolution: writePolicyResolutionWire(
			resolvePolicyRules({ countryCode: null, regionCode: null, rules: [rule] })
		),
		translations: { language: 'en', translations: bundle },
	} as InitOutput;
};

const mockFetch = function mockFetch(): typeof fetch {
	return vi.fn(
		() =>
			new Response(JSON.stringify({ ok: true }), {
				headers: { 'content-type': 'application/json' },
				status: 200,
			})
	) as unknown as typeof fetch;
};

const query = function query(testId: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
};

let mounted: {
	context: VueConsentKernelContext;
	wrapper: VueWrapper<ComponentPublicInstance>;
} | null = null;

const renderBanner = async function renderBanner(init: InitOutput) {
	const config = {
		backendURL: 'https://consent.example',
		consentCategories: ['necessary', 'measurement', 'marketing'],
		customFetch: mockFetch(),
		disableAnimation: true,
		domain: 'consent.example',
		hideBranding: true,
		trapFocus: false,
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
	await flushPromises();
	await vi.waitFor(() => {
		if (!query('consent-banner-root')) {
			throw new Error('banner not mounted');
		}
	});
	mounted = { context, wrapper };
	return context;
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
});

describe('ConsentBanner under a notice prompt', () => {
	test('renders the dismiss action as the primary Accept All control', async () => {
		await renderBanner(buildInit(noticeRule));
		const dismiss = query('consent-banner-dismiss-button');
		expect(dismiss?.textContent?.trim()).toBe('Accept All');
		expect(dismiss?.getAttribute('data-action')).toBe('dismiss');
		expect(dismiss?.getAttribute('data-variant')).toBe('primary');
		expect(query('consent-banner-accept-button')).toBeNull();
		expect(query('consent-banner-reject-button')).toBeNull();
	});

	test('renders one neutral opt-out button before the actions', async () => {
		await renderBanner(buildInit(noticeRule));
		const rights = query('consent-banner-rights');
		expect(rights).toBeInstanceOf(HTMLElement);
		const links = [
			...(rights?.querySelectorAll<HTMLButtonElement>('[data-right]') ?? []),
		];
		expect(links.map((link) => link.getAttribute('data-right'))).toEqual([
			'opt-out',
		]);
		expect(links.map((link) => link.textContent?.trim())).toEqual([
			'Do not sell my info',
		]);
		const [optOut] = links;
		expect(query('consent-banner-right-link-opt-out')).toBe(optOut);
		expect(optOut?.getAttribute('data-action')).toBe('right');
		expect(optOut?.getAttribute('data-variant')).toBe('neutral');
		expect(optOut?.getAttribute('data-mode')).toBe('stroke');
		expect(query('consent-banner-right-link-preferences')).toBeNull();
		const group = query('consent-banner-footer-sub-group');
		expect(group).toBeInstanceOf(HTMLElement);
		const footerChildren = [...(rights?.parentElement?.children ?? [])];
		expect(footerChildren.indexOf(rights as Element)).toBeLessThan(
			footerChildren.indexOf(group as Element)
		);
	});

	test('marks the root with the prompt and model', async () => {
		await renderBanner(buildInit(noticeRule));
		const root = query('consent-banner-root');
		expect(root?.getAttribute('data-prompt')).toBe('notice');
		expect(root?.getAttribute('data-model')).toBe('opt-out');
	});

	test('opens the preference center from the opt-out button', async () => {
		const context = await renderBanner(buildInit(noticeRule));
		query('consent-banner-right-link-opt-out')?.click();
		await flushPromises();
		expect(context.activeUI.value).toBe('manager');
	});

	test('uses the notice copy', async () => {
		await renderBanner(buildInit(noticeRule));
		expect(query('consent-banner-title')?.textContent?.trim()).toBe(
			'Notice title'
		);
		expect(query('consent-banner-description')?.textContent?.trim()).toBe(
			'Notice description'
		);
	});

	test('falls back to the choice copy when notice copy is missing', async () => {
		await renderBanner(
			buildInit(noticeRule, {
				...translations,
				cookieBanner: {
					description: 'Choice description',
					title: 'Choice title',
				} as typeof translations.cookieBanner,
			})
		);
		expect(query('consent-banner-title')?.textContent?.trim()).toBe(
			'Choice title'
		);
		expect(query('consent-banner-description')?.textContent?.trim()).toBe(
			'Choice description'
		);
	});
});

describe('ConsentBanner under a choice prompt', () => {
	test('renders no rights group when customize covers preferences', async () => {
		await renderBanner(buildInit(choiceRule));
		expect(query('consent-banner-rights')).toBeNull();
		expect(query('consent-banner-dismiss-button')).toBeNull();
		expect(query('consent-banner-customize-button')).toBeInstanceOf(
			HTMLElement
		);
		const root = query('consent-banner-root');
		expect(root?.getAttribute('data-prompt')).toBe('choice');
		expect(root?.getAttribute('data-model')).toBe('opt-in');
		expect(query('consent-banner-title')?.textContent?.trim()).toBe(
			'Choice title'
		);
	});

	test('renders a preferences button when the prompt offers no customize', async () => {
		await renderBanner(
			buildInit({ ...choiceRule, actions: ['accept', 'reject'] })
		);
		const links = [
			...document.querySelectorAll<HTMLElement>(
				'[data-testid="consent-banner-rights"] [data-right]'
			),
		];
		expect(links.map((link) => link.getAttribute('data-right'))).toEqual([
			'preferences',
		]);
	});
});
