/**
 * The roots load the dialog trigger, and Nuxt's root the banner, as their
 * own chunks, so their stylesheets stay out of the entry and no longer
 * block the first paint. These tests check that the surfaces still render:
 * the trigger after mount, the Nuxt banner on the server and in the
 * browser.
 */
import type { InitOutput } from '@c15t/schema/types';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Component } from 'vue';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { c15tVue } from '../index';
import NuxtConsentRoot from '../runtime/components/nuxt-root.vue';
import ConsentRoot from '../runtime/components/root.vue';
import { consentConfigKey } from '../runtime/composables/config';
import type { RuntimeConsentConfig } from '../runtime/kernel';
import { createVueConsentKernelContext } from '../runtime/kernel';
import {
	symbolActiveUI,
	symbolConsent,
	symbolInit,
	symbolKernel,
	symbolKernelContext,
	symbolSnapshot,
} from '../runtime/utils/symbols';

const initFixture: InitOutput = {
	branding: 'c15t',
	location: { countryCode: 'DE', regionCode: null },
	policyResolution: writePolicyResolutionWire(
		resolvePolicyRules({
			countryCode: null,
			regionCode: null,
			rules: [
				{
					categories: ['measurement'],
					id: 'policy_gdpr',
					match: { fallback: true },
					model: 'opt-in',
					prompt: 'choice',
					scopeMode: 'strict',
				},
			],
		})
	),
	policySnapshotToken: 'token_gdpr',
	translations: {
		language: 'en',
		translations: {
			cookieBanner: {
				description: 'Pick how c15t may use cookies.',
				title: 'Cookie choices',
			},
		},
	},
} as InitOutput;

const config: RuntimeConsentConfig = {
	backendURL: 'https://consent.example',
	consentCategories: ['necessary', 'measurement'],
	domain: 'consent.example',
	showTrigger: true,
	triggerShowWhen: 'always',
};

const trigger = () =>
	document.querySelector('[data-testid="consent-dialog-trigger"]');
const banner = () =>
	document.querySelector('[data-testid="consent-banner-root"]');

const waitFor = async function waitFor(check: () => unknown) {
	// The surfaces arrive through dynamic imports, which Vite compiles on
	// first request. Give that 2 seconds: a parallel run across packages can
	// take far longer than the half second a quiet machine needs.
	const deadline = Date.now() + 2000;
	while (Date.now() < deadline && !check()) {
		// oxlint-disable-next-line no-await-in-loop -- Polling in order.
		await flushPromises();
		// oxlint-disable-next-line no-await-in-loop -- Polling in order.
		await new Promise((resolve) => {
			setTimeout(resolve, 10);
		});
	}
	return check();
};

beforeEach(() => {
	vi.stubGlobal(
		'fetch',
		vi.fn(
			() =>
				new Response(JSON.stringify(initFixture), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				})
		)
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
	document.body.innerHTML = '';
	window.localStorage.clear();
});

describe.each([
	['ConsentRoot', ConsentRoot],
	['Nuxt ConsentRoot', NuxtConsentRoot],
] as [string, Component][])('%s', (_name, Root) => {
	test('renders the banner and, after mount, the lazy dialog trigger', async () => {
		const wrapper = mount(Root, {
			attachTo: document.body,
			global: { plugins: [[c15tVue, config]] },
		});
		try {
			expect(await waitFor(banner)).toBeTruthy();
			expect(await waitFor(trigger)).toBeTruthy();
		} finally {
			wrapper.unmount();
		}
	});
});

describe('Nuxt ConsentRoot on the server', () => {
	test('renders the lazy banner into the HTML and no trigger', async () => {
		const runtimeConfig: RuntimeConsentConfig = {
			...config,
			customFetch: fetch,
		};
		const context = createVueConsentKernelContext({
			config: runtimeConfig,
			prefetch: initFixture,
		});
		try {
			const app = createSSRApp(NuxtConsentRoot);
			app.provide(consentConfigKey, runtimeConfig);
			app.provide(symbolKernelContext, context);
			app.provide(symbolKernel, context.kernel);
			app.provide(symbolSnapshot, context.snapshot);
			app.provide(symbolInit, context.init);
			app.provide(symbolActiveUI, context.activeUI);
			app.provide(symbolConsent, context.storedConsent);
			const html = await renderToString(app, {});

			expect(html).toContain('data-testid="consent-banner-root"');
			expect(html).not.toContain('consent-dialog-trigger');
		} finally {
			context.dispose();
		}
	});
});
