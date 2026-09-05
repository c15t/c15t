import type { InitOutput, TranslationsResponse } from '@c15t/schema/types';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { describe, expect, test, vi } from 'vitest';
import type { ComponentPublicInstance } from 'vue';

import ConsentManager from '../runtime/components/consent-manager.vue';
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

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

const translations: TranslationsResponse = {
	common: {
		acceptAll: 'Accept all',
		customize: 'Customize',
		rejectAll: 'Reject all',
		save: 'Save settings',
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
	frame: {
		actionButton: 'Manage',
		title: 'Privacy',
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
	location: {
		countryCode: 'DE',
		regionCode: null,
	},
	policyResolution: writePolicyResolutionWire(
		resolvePolicyRules({
			countryCode: null,
			regionCode: null,
			rules: [
				{
					categories: ['functionality', 'measurement'],
					id: 'vue_a11y_policy',
					match: { fallback: true },
					model: 'opt-in',
					prompt: 'choice',
					scopeMode: 'permissive',
				},
			],
		})
	),
	policySnapshotToken: 'vue_a11y_token',
	translations: {
		language: 'en',
		translations,
	},
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

const renderManager = async function renderManager() {
	const config = {
		backendURL: 'https://consent.example',
		consentCategories: ['necessary', 'functionality', 'measurement'],
		customFetch: mockFetch(),
		disableAnimation: true,
		domain: 'consent.example',
		hideBranding: false,
		trapFocus: false,
	} as ConsentConfig;
	const context = createVueConsentKernelContext({ config, prefetch: init });
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
	await flushPromises();
	await createDeferredPromise((resolve) => setTimeout(resolve, 0));

	return { context, wrapper };
};

const cleanup = async function cleanup(
	wrapper: VueWrapper<ComponentPublicInstance>,
	context: VueConsentKernelContext
) {
	const { element } = wrapper;
	wrapper.unmount();
	element.remove();
	context.dispose();
	await flushPromises();
};

describe('ConsentManager accordion accessibility', () => {
	test('renders a dialog overlay even when focus trapping is disabled', async () => {
		const { context, wrapper } = await renderManager();
		try {
			const overlay = document.querySelector(
				'[data-testid="consent-dialog-overlay"]'
			);
			expect(overlay).toBeInstanceOf(HTMLElement);
			expect(overlay?.getAttribute('aria-hidden')).toBe('true');
			expect(overlay?.className).toContain('overlayVisible');
		} finally {
			await cleanup(wrapper, context);
		}
	});

	test('keeps switches outside accordion trigger buttons', async () => {
		const { context, wrapper } = await renderManager();
		try {
			const switchEl = document.querySelector(
				'[data-testid="consent-widget-switch-functionality"]'
			);
			expect(switchEl).toBeInstanceOf(HTMLElement);
			expect(switchEl?.closest('[role="button"]')).toBeNull();
		} finally {
			await cleanup(wrapper, context);
		}
	});

	test('Space toggles a focused switch without opening the accordion', async () => {
		const { context, wrapper } = await renderManager();
		try {
			const switchEl = document.querySelector(
				'[data-testid="consent-widget-switch-functionality"]'
			) as HTMLElement;
			const content = document.querySelector(
				'[data-testid="consent-widget-accordion-content-functionality"]'
			);

			expect(switchEl.getAttribute('aria-checked')).toBe('false');
			expect(content?.getAttribute('data-state')).toBe('closed');

			switchEl.dispatchEvent(
				new KeyboardEvent('keydown', { bubbles: true, key: ' ' })
			);
			await flushPromises();

			expect(switchEl.getAttribute('aria-checked')).toBe('true');
			expect(content?.getAttribute('data-state')).toBe('closed');
		} finally {
			await cleanup(wrapper, context);
		}
	});

	test('Enter toggles the accordion trigger and updates aria-expanded', async () => {
		const { context, wrapper } = await renderManager();
		try {
			const trigger = document.querySelector(
				'[data-testid="consent-widget-accordion-trigger-functionality"]'
			) as HTMLElement;
			const content = document.querySelector(
				'[data-testid="consent-widget-accordion-content-functionality"]'
			);

			expect(trigger.getAttribute('aria-expanded')).toBe('false');
			expect(content?.getAttribute('data-state')).toBe('closed');

			trigger.dispatchEvent(
				new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })
			);
			await flushPromises();

			expect(trigger.getAttribute('aria-expanded')).toBe('true');
			expect(content?.getAttribute('data-state')).toBe('open');
		} finally {
			await cleanup(wrapper, context);
		}
	});

	test('tab order reaches optional switches separately from triggers', async () => {
		const { context, wrapper } = await renderManager();
		try {
			const trigger = document.querySelector(
				'[data-testid="consent-widget-accordion-trigger-functionality"]'
			) as HTMLElement;
			const switchEl = document.querySelector(
				'[data-testid="consent-widget-switch-functionality"]'
			) as HTMLElement;
			const measurementTrigger = document.querySelector(
				'[data-testid="consent-widget-accordion-trigger-measurement"]'
			) as HTMLElement;
			const focusables = Array.from(
				document.querySelectorAll<HTMLElement>(
					'[role="button"][tabindex="0"], button:not([disabled])'
				)
			);

			expect(focusables.indexOf(trigger)).toBeGreaterThanOrEqual(0);
			expect(focusables.indexOf(switchEl)).toBeGreaterThan(
				focusables.indexOf(trigger)
			);
			expect(focusables.indexOf(measurementTrigger)).toBeGreaterThan(
				focusables.indexOf(switchEl)
			);

			switchEl.focus();
			expect(document.activeElement).toBe(switchEl);
		} finally {
			await cleanup(wrapper, context);
		}
	});

	test('preferences keep accept and reject equivalent and expose save', async () => {
		const { context, wrapper } = await renderManager();
		try {
			const reject = document.querySelector('[data-action="reject"]');
			const accept = document.querySelector('[data-action="accept"]');
			const customize = document.querySelector('[data-action="save"]');

			expect(reject?.getAttribute('data-variant')).toBe('neutral');
			expect(reject?.getAttribute('data-mode')).toBe('stroke');
			expect(accept?.getAttribute('data-variant')).toBe('neutral');
			expect(accept?.getAttribute('data-mode')).toBe('stroke');
			expect(customize?.getAttribute('data-variant')).toBe('primary');
			expect(customize?.getAttribute('data-mode')).toBe('stroke');
		} finally {
			await cleanup(wrapper, context);
		}
	});
});
