import type { PromptPresentation } from '@c15t/core';
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
	language = 'en'
): InitOutput {
	return {
		branding: 'c15t',
		jurisdiction: 'GDPR',
		location: { countryCode: 'US', regionCode: 'CA' },
		policyResolution: writePolicyResolutionWire(
			resolvePolicyRules({ countryCode: null, regionCode: null, rules: [rule] })
		),
		translations: { language, translations: enTranslations },
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

interface RenderOptions {
	config?: Partial<ConsentConfig>;
	props?: {
		variant?: PromptPresentation['variant'];
		position?: PromptPresentation['position'];
		blocking?: boolean;
	};
}

const renderBanner = async function renderBanner(
	init: InitOutput,
	options: RenderOptions = {}
) {
	const config = {
		backendURL: 'https://consent.example',
		consentCategories: ['necessary', 'measurement', 'marketing'],
		customFetch: mockFetch(),
		disableAnimation: true,
		domain: 'consent.example',
		hideBranding: true,
		...options.config,
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
		props: options.props,
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

const rootAttributes = function rootAttributes() {
	const root = query('consent-banner-root');
	return {
		blocking: root?.getAttribute('data-blocking'),
		position: root?.getAttribute('data-position'),
		variant: root?.getAttribute('data-variant'),
	};
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

describe('ConsentBanner surface variants', () => {
	test('a choice prompt defaults to a floating bottom-left card', async () => {
		// Modal semantics follow the focus trap, so switch it off to isolate
		// the non-blocking default.
		await renderBanner(buildInit(choiceRule), { config: { trapFocus: false } });
		expect(rootAttributes()).toEqual({
			blocking: null,
			position: 'bottom-left',
			variant: 'floating',
		});
		expect(query('consent-banner-overlay')).toBeNull();
		expect(query('consent-banner-card')?.getAttribute('aria-modal')).toBeNull();
	});

	test('a notice prompt defaults to a bottom bar and never blocks', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		await renderBanner(buildInit(noticeRule), {
			config: { presentation: { prompt: { blocking: true } } },
		});
		expect(rootAttributes()).toEqual({
			blocking: null,
			position: 'bottom',
			variant: 'bar',
		});
		expect(query('consent-banner-overlay')).toBeNull();
		expect(
			warn.mock.calls.some(([message]) =>
				String(message).includes('blocking-forbidden')
			)
		).toBe(true);
	});

	test('a wall blocks: backdrop, modal semantics and a blocking marker', async () => {
		await renderBanner(buildInit(choiceRule), {
			config: { presentation: { prompt: { variant: 'wall' } } },
		});
		expect(rootAttributes()).toEqual({
			blocking: 'true',
			position: 'center',
			variant: 'wall',
		});
		expect(query('consent-banner-overlay')).toBeInstanceOf(HTMLElement);
		const card = query('consent-banner-card');
		expect(card?.getAttribute('role')).toBe('dialog');
		expect(card?.getAttribute('aria-modal')).toBe('true');
	});

	test('mirrors only a defaulted corner for right-to-left text', async () => {
		await renderBanner(buildInit(choiceRule, 'he'));
		expect(rootAttributes().position).toBe('bottom-right');
		expect(query('consent-banner-root')?.getAttribute('dir')).toBe('rtl');
	});

	test('keeps a host-chosen corner under right-to-left text', async () => {
		await renderBanner(buildInit(choiceRule, 'he'), {
			config: { presentation: { prompt: { position: 'top-left' } } },
		});
		expect(rootAttributes().position).toBe('top-left');
	});

	test('does not mirror a bar edge', async () => {
		await renderBanner(buildInit(noticeRule, 'he'));
		expect(rootAttributes()).toMatchObject({
			position: 'bottom',
			variant: 'bar',
		});
	});

	test('falls back from a position the variant cannot take and warns', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		await renderBanner(buildInit(choiceRule), {
			config: {
				presentation: { prompt: { position: 'bottom-left', variant: 'bar' } },
			},
		});
		expect(rootAttributes()).toMatchObject({
			position: 'bottom',
			variant: 'bar',
		});
		expect(
			warn.mock.calls.some(([message]) =>
				String(message).includes('invalid-position')
			)
		).toBe(true);
	});

	test('component props beat the host presentation', async () => {
		await renderBanner(buildInit(choiceRule), {
			config: {
				presentation: { prompt: { position: 'top', variant: 'bar' } },
			},
			props: { position: 'top-right', variant: 'widget' },
		});
		expect(rootAttributes()).toEqual({
			blocking: null,
			position: 'top-right',
			variant: 'widget',
		});
	});

	test('a blocking prop forces the backdrop and focus semantics', async () => {
		await renderBanner(buildInit(choiceRule), { props: { blocking: true } });
		expect(rootAttributes()).toMatchObject({
			blocking: 'true',
			variant: 'floating',
		});
		expect(query('consent-banner-overlay')).toBeInstanceOf(HTMLElement);
		expect(query('consent-banner-card')?.getAttribute('aria-modal')).toBe(
			'true'
		);
	});

	test('the legacy bannerPosition config maps onto the prompt position', async () => {
		await renderBanner(buildInit(choiceRule, 'he'), {
			config: { bannerPosition: 'top-right' },
		});
		// Host-chosen through the legacy field, so no rtl mirroring either.
		expect(rootAttributes()).toMatchObject({
			position: 'top-right',
			variant: 'floating',
		});
	});
});
