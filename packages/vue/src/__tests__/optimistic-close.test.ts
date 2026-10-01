import type { InitOutput, TranslationsResponse } from '@c15t/schema/types';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, expect, test, vi } from 'vitest';
import { nextTick } from 'vue';

import ConsentManager from '../runtime/components/manager.vue';
import { consentConfigKey } from '../runtime/composables/config';
import type { ConsentConfig } from '../runtime/config';
import {
	createVueConsentKernelContext,
	startVueConsentRuntime,
} from '../runtime/kernel';
import {
	symbolActiveUI,
	symbolConsent,
	symbolInit,
	symbolKernel,
	symbolKernelContext,
	symbolSnapshot,
} from '../runtime/utils/symbols';

const translations: TranslationsResponse = {
	common: {
		acceptAll: 'Accept all',
		customize: 'Customize',
		rejectAll: 'Reject all',
		save: 'Save settings',
	},
	consentGate: {
		actionButton: 'Manage',
		title: 'Privacy',
	},
	consentManagerDialog: {
		description: 'Manage your choices.',
		title: 'Privacy preferences',
	},
	consentTypes: {
		experience: {
			description: 'Experience cookies.',
			title: 'Experience',
		},
		functionality: {
			description: 'Feature cookies.',
			title: 'Functionality',
		},
		marketing: {
			description: 'Targeted advertising.',
			title: 'Marketing',
		},
		measurement: {
			description: 'Analytics and performance measurement.',
			title: 'Measurement',
		},
		necessary: {
			description: 'Required for the site to function.',
			title: 'Necessary',
		},
	},
	cookieBanner: {
		description: 'We use cookies to enhance your experience.',
		title: 'We value your privacy',
	},
	legalLinks: {
		cookiePolicy: 'Cookie policy',
		privacyPolicy: 'Privacy policy',
		termsOfService: 'Terms of service',
	},
};

const init: InitOutput = {
	branding: 'c15t',
	jurisdiction: 'GDPR',
	location: { countryCode: 'DE', regionCode: null },
	policyResolution: writePolicyResolutionWire(
		resolvePolicyRules({
			countryCode: null,
			regionCode: null,
			rules: [
				{
					categories: ['functionality', 'measurement'],
					id: 'vue_optimistic_close',
					match: { fallback: true },
					model: 'opt-in',
					prompt: 'choice',
					scopeMode: 'permissive',
				},
			],
		})
	),
	policySnapshotToken: 'vue_optimistic_token',
	translations: { language: 'en', translations },
};

const buttons = {
	accept: 'consent-widget-footer-accept-all-button',
	reject: 'consent-widget-reject-button',
	save: 'consent-widget-footer-save-button',
} as const;

afterEach(() => {
	localStorage.clear();
	for (const cookie of document.cookie.split(';')) {
		const name = cookie.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
});

for (const action of ['accept', 'reject', 'save'] as const) {
	for (const outcome of ['pending', 'rejected'] as const) {
		test(`the manager closes on ${action} before a ${outcome} save settles`, async () => {
			let storedAtSave: string | null = null;
			const fetch = vi.fn((input: RequestInfo | URL) => {
				if (!String(input).endsWith('/subjects')) {
					return Promise.resolve(Response.json({}));
				}
				storedAtSave = localStorage.getItem('c15t');
				return outcome === 'pending'
					? Promise.withResolvers<Response>().promise
					: Promise.reject(new Error('offline'));
			});
			const onError = vi.fn();
			const onBeforeLoad = vi.fn();
			const config = {
				backendURL: 'https://consent.example',
				consentCategories: ['necessary', 'functionality', 'measurement'],
				customFetch: fetch as unknown as typeof globalThis.fetch,
				disableAnimation: true,
				scripts: [
					{
						callbackOnly: true,
						category: 'measurement',
						id: 'optimistic-measurement',
						onBeforeLoad,
					},
				],
				trapFocus: false,
			} as ConsentConfig;
			const context = createVueConsentKernelContext({ config, prefetch: init });
			const stop = startVueConsentRuntime(context, config, { runInit: false });
			const offError = context.kernel.events.on('command:error', onError);
			context.activeUI.value = 'manager';
			const wrapper = mount(ConsentManager, {
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
			const dialog = () =>
				document.querySelector('[data-testid="consent-dialog-root"]');
			try {
				await flushPromises();
				expect(dialog()).not.toBeNull();
				const { kernel } = context;
				document
					.querySelector<HTMLButtonElement>(
						`[data-testid="${buttons[action]}"]`
					)
					?.click();
				// Closed in the click task, before the request is sent.
				expect(kernel.getSnapshot().activeUI).toBe('none');
				expect(
					kernel.getSnapshot().explicitChoice?.categories.measurement?.value
				).toBe(action === 'accept');
				expect(onBeforeLoad).toHaveBeenCalledTimes(action === 'accept' ? 1 : 0);
				await nextTick();
				expect(dialog()).toBeNull();
				await vi.waitFor(() =>
					expect(
						fetch.mock.calls.some(([input]) =>
							String(input).endsWith('/subjects')
						)
					).toBe(true)
				);
				expect(storedAtSave).toContain('measurement');
				// A failed request reaches the error event once; a pending one never.
				await vi.waitFor(() =>
					expect(onError).toHaveBeenCalledTimes(outcome === 'rejected' ? 1 : 0)
				);
				await new Promise((resolve) => {
					setTimeout(resolve, 20);
				});
				await flushPromises();
				expect(kernel.getSnapshot().activeUI).toBe('none');
				expect(dialog()).toBeNull();
				expect(
					kernel.getSnapshot().explicitChoice?.categories.measurement?.value
				).toBe(action === 'accept');
			} finally {
				const { element } = wrapper;
				wrapper.unmount();
				element.remove();
				offError();
				stop();
				context.dispose();
				await flushPromises();
			}
		});
	}
}

for (const action of ['accept', 'reject', 'save'] as const) {
	test(`with nothing declared, ${action} in the necessary-only manager acknowledges and closes before the save settles`, async () => {
		const bodies: unknown[] = [];
		const fetch = vi.fn((input: RequestInfo | URL, request?: RequestInit) => {
			if (!String(input).endsWith('/subjects')) {
				return Promise.resolve(Response.json({}));
			}
			bodies.push(JSON.parse(String(request?.body)));
			return Promise.withResolvers<Response>().promise;
		});
		const config = {
			backendURL: 'https://consent.example',
			customFetch: fetch as unknown as typeof globalThis.fetch,
			disableAnimation: true,
			trapFocus: false,
		} as ConsentConfig;
		const context = createVueConsentKernelContext({ config, prefetch: init });
		const stop = startVueConsentRuntime(context, config, { runInit: false });
		expect(context.kernel.getSnapshot().activeUI).toBe('banner');
		context.activeUI.value = 'manager';
		const wrapper = mount(ConsentManager, {
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
		try {
			await flushPromises();
			expect(
				document.querySelectorAll('[data-testid^="consent-widget-switch-"]')
			).toHaveLength(1);
			expect(
				document.querySelector(
					'[data-testid="consent-widget-switch-necessary"]'
				)
			).not.toBeNull();
			document
				.querySelector<HTMLButtonElement>(`[data-testid="${buttons[action]}"]`)
				?.click();
			// Closed in the click task, before the request is sent.
			expect(context.kernel.getSnapshot().activeUI).toBe('none');
			expect(context.kernel.getSnapshot().promptRequirement).toEqual({
				kind: 'none',
			});
			await vi.waitFor(() => expect(bodies).toHaveLength(1));
			expect(bodies[0]).toMatchObject({
				choice: { categories: {}, version: 3 },
				preferences: { necessary: true },
			});
			// Reopened later, the prompt is already answered: only the renewed
			// acknowledgement tells the manager to close before the request.
			await new Promise((resolve) => {
				setTimeout(resolve, 5);
			});
			context.activeUI.value = 'manager';
			await flushPromises();
			document
				.querySelector<HTMLButtonElement>(`[data-testid="${buttons[action]}"]`)
				?.click();
			expect(context.kernel.getSnapshot().activeUI).toBe('none');
			await vi.waitFor(() => expect(bodies).toHaveLength(2));
		} finally {
			const { element } = wrapper;
			wrapper.unmount();
			element.remove();
			stop();
			context.dispose();
			await flushPromises();
		}
	});
}
