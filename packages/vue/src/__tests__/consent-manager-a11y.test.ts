import type { InitOutput, TranslationsResponse } from '@c15t/schema/types';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { describe, expect, test, vi } from 'vitest';
import type { Component, ComponentPublicInstance } from 'vue';

import ConsentDialogTrigger from '../runtime/components/consent-dialog-trigger.vue';
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

const renderManager = async function renderManager(
	overrides: Partial<ConsentConfig> = {},
	component: Component = ConsentManager
) {
	const config = {
		backendURL: 'https://consent.example',
		consentCategories: ['necessary', 'functionality', 'measurement'],
		customFetch: mockFetch(),
		disableAnimation: true,
		domain: 'consent.example',
		hideBranding: false,
		trapFocus: false,
		...overrides,
	} as ConsentConfig;
	const context = createVueConsentKernelContext({ config, prefetch: init });
	context.activeUI.value = 'manager';

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

	test('native switch activation toggles without opening the accordion', async () => {
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

			switchEl.click();
			await flushPromises();

			expect(switchEl.getAttribute('aria-checked')).toBe('true');
			expect(content?.getAttribute('data-state')).toBe('closed');
		} finally {
			await cleanup(wrapper, context);
		}
	});

	test('native trigger activation updates aria-expanded', async () => {
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

			trigger.click();
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

describe('ConsentManager widget composition', () => {
	const button = (action: string) => {
		const element = document.querySelector<HTMLButtonElement>(
			`[data-action="${action}"]`
		);
		expect(element).toBeInstanceOf(HTMLButtonElement);
		if (!element) {
			throw new Error(`Missing ${action} action`);
		}
		return element;
	};

	for (const action of ['accept', 'reject', 'save']) {
		test(`${action} waits for completion, stays open on failure, and returns to a required prompt`, async () => {
			const { context, wrapper } = await renderManager();
			try {
				let complete: ((value: { ok: false }) => void) | undefined;
				const pending = createDeferredPromise<{ ok: false }>((resolve) => {
					complete = resolve;
				});
				const save = vi
					.spyOn(context.kernel.commands, 'save')
					.mockReturnValueOnce(pending)
					.mockResolvedValueOnce({ ok: true });
				button(action).click();
				await flushPromises();
				expect(save).toHaveBeenCalledTimes(1);
				expect(context.activeUI.value).toBe('manager');
				complete?.({ ok: false });
				await flushPromises();
				expect(context.activeUI.value).toBe('manager');
				button(action).click();
				await flushPromises();
				expect(save).toHaveBeenCalledTimes(2);
				expect(context.activeUI.value).toBe('banner');
			} finally {
				await cleanup(wrapper, context);
			}
		});
	}

	test('successful save closes when no prompt remains', async () => {
		const { context, wrapper } = await renderManager();
		try {
			await context.kernel.commands.save('all');
			await flushPromises();
			expect(context.snapshot.value.promptRequirement.kind).toBe('none');
			context.activeUI.value = 'manager';
			await flushPromises();
			button('save').click();
			await flushPromises();
			await vi.waitFor(() => expect(context.activeUI.value).toBeNull());
		} finally {
			await cleanup(wrapper, context);
		}
	});

	test('reopening discards unsaved draft changes and save uses the displayed draft', async () => {
		const { context, wrapper } = await renderManager();
		const toggle = () => {
			const element = document.querySelector<HTMLButtonElement>(
				'[data-testid="consent-widget-switch-functionality"]'
			);
			if (!element) {
				throw new Error('Missing functionality switch');
			}
			return element;
		};
		try {
			toggle().click();
			await flushPromises();
			expect(toggle().getAttribute('aria-checked')).toBe('true');
			context.activeUI.value = null;
			await flushPromises();
			context.activeUI.value = 'manager';
			await flushPromises();
			expect(toggle().getAttribute('aria-checked')).toBe('false');
			toggle().click();
			await flushPromises();
			const save = vi
				.spyOn(context.kernel.commands, 'save')
				.mockResolvedValue({ ok: false });
			button('save').click();
			await flushPromises();
			expect(save).toHaveBeenCalledWith({
				functionality: true,
				measurement: false,
			});
		} finally {
			await cleanup(wrapper, context);
		}
	});

	test('configuration reaches widget regions and retains host handlers', async () => {
		const onClick = vi.fn();
		const { context, wrapper } = await renderManager({
			components: {
				accordion: {
					contentInner: { class: 'host-inner' },
					triggerRow: { onClick },
				},
				'accordion-item': { trigger: { class: 'host-trigger' } },
				button: { primary: { class: 'host-primary' } },
				manager: {
					actionGroup: { class: 'host-group' },
					actions: { class: 'host-actions' },
					footer: { class: 'host-footer' },
					root: { class: 'host-root' },
				},
				switch: { thumb: { class: 'host-thumb' } },
			},
		});
		try {
			for (const region of [
				'inner',
				'trigger',
				'primary',
				'group',
				'footer',
				'root',
				'thumb',
			]) {
				expect(document.querySelector(`.host-${region}`)).not.toBeNull();
			}
			expect(document.querySelector('.host-actions')).not.toBeNull();
			document.querySelector<HTMLButtonElement>('.host-trigger')?.click();
			await flushPromises();
			expect(onClick).toHaveBeenCalledTimes(1);
		} finally {
			await cleanup(wrapper, context);
		}
	});
});

test('branding trigger renders the current brand mark instead of a menu icon', async () => {
	const { context, wrapper } = await renderManager(
		{ triggerIcon: 'branding' },
		ConsentDialogTrigger
	);
	try {
		context.activeUI.value = null;
		await flushPromises();
		const trigger = document.querySelector(
			'[data-testid="consent-dialog-trigger"]'
		);
		expect(trigger?.getAttribute('data-c15t-trigger')).toBe('true');
		expect(trigger?.querySelector('svg')?.getAttribute('viewBox')).toBe(
			'0 0 446 445'
		);
	} finally {
		await cleanup(wrapper, context);
	}
});
