import type { KernelOverrides, KernelTransport } from '@c15t/core';
import type { PolicyRule } from '@c15t/schema/types';
import { resolvePolicyRules } from '@c15t/schema/types';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { Component, ComponentPublicInstance } from 'vue';
import { defineComponent, h, nextTick, ref } from 'vue';

import NuxtConsentRoot from '../runtime/components/nuxt-root.vue';
import { consentConfigKey } from '../runtime/composables/config';
import { useConsentLanguage } from '../runtime/composables/language';
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

const rule: PolicyRule = {
	id: 'vue_language',
	match: { fallback: true, isDefault: true },
	model: 'opt-in',
	prompt: 'choice',
};

let mounted: {
	context: VueConsentKernelContext;
	stop?: () => void;
	wrapper: VueWrapper<ComponentPublicInstance>;
} | null = null;

const config = { consentCategories: ['necessary'] } as ConsentConfig;

/** A transport that answers each init with copy in the requested language. */
const createTransport = function createTransport() {
	const init = vi.fn<NonNullable<KernelTransport['init']>>((ctx) => {
		const language = ctx.overrides.language ?? 'en';
		return Promise.resolve({
			location: { countryCode: 'DE', regionCode: null },
			translations: {
				language,
				translations: {
					common: { acceptAll: `accept-${language}` },
				},
			},
		} as Awaited<ReturnType<NonNullable<KernelTransport['init']>>>);
	});
	return {
		init,
		save: () => Promise.resolve({ ok: true, subjectId: 'vue-language' }),
	} satisfies KernelTransport;
};

const renderWith = async function renderWith(
	component: Component,
	initialOverrides?: KernelOverrides
) {
	const transport = createTransport();
	const context = createVueConsentKernelContext({
		config,
		kernelConfig: {
			initialOverrides,
			initialPolicyResolution: resolvePolicyRules({
				countryCode: 'DE',
				regionCode: null,
				rules: [rule],
			}),
			transport,
		},
	});
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
	mounted = { context, wrapper };
	return { context, transport };
};

/** Start the browser runtime, as the plugin does once the app mounts. */
const start = function start(context: VueConsentKernelContext) {
	context.start();
	const { dispose: stop } = context;
	if (mounted) {
		mounted.stop = stop;
	}
};

afterEach(() => {
	if (mounted) {
		mounted.wrapper.unmount();
		mounted.stop?.();
		mounted.context.dispose();
		mounted = null;
	}
	document.body.innerHTML = '';
});

describe('changing the consent language', () => {
	test('useConsentLanguage loads the copy for the new language', async () => {
		let language!: ReturnType<typeof useConsentLanguage>;
		const { context, transport } = await renderWith(
			defineComponent({
				setup() {
					language = useConsentLanguage();
					return () => h('p', language.value ?? '');
				},
			})
		);
		transport.init.mockClear();

		language.value = 'de';
		await flushPromises();

		expect(transport.init).toHaveBeenCalledTimes(1);
		expect(transport.init.mock.calls[0]?.[0].overrides.language).toBe('de');
		expect(context.snapshot.value.translations?.language).toBe('de');
		expect(language.value).toBe('de');
	});

	test('setting the same language again fetches nothing', async () => {
		let language!: ReturnType<typeof useConsentLanguage>;
		const { transport } = await renderWith(
			defineComponent({
				setup() {
					language = useConsentLanguage();
					return () => h('p', language.value ?? '');
				},
			})
		);
		language.value = 'de';
		await flushPromises();
		transport.init.mockClear();

		language.value = 'de';
		await flushPromises();

		expect(transport.init).not.toHaveBeenCalled();
	});

	test('the Nuxt ConsentRoot language prop loads that language', async () => {
		const current = ref('fr');
		const { context, transport } = await renderWith(
			defineComponent({
				setup: () => () => h(NuxtConsentRoot, { language: current.value }),
			})
		);
		start(context);
		await flushPromises();

		// The startup init loads the prop's language; setup adds no second one.
		expect(transport.init).toHaveBeenCalledTimes(1);
		expect(transport.init.mock.calls[0]?.[0].overrides.language).toBe('fr');
		expect(context.snapshot.value.translations?.language).toBe('fr');

		current.value = 'de';
		await nextTick();
		await flushPromises();

		expect(transport.init).toHaveBeenCalledTimes(2);
		expect(context.snapshot.value.translations?.language).toBe('de');
	});

	test('a ConsentRoot prop equal to the prefetched override runs no init', async () => {
		const { context, transport } = await renderWith(
			defineComponent({
				setup: () => () => h(NuxtConsentRoot, { language: 'en' }),
			}),
			{ country: 'DE', language: 'en' }
		);
		start(context);
		await flushPromises();

		expect(transport.init).not.toHaveBeenCalled();
		expect(context.snapshot.value.overrides).toMatchObject({
			country: 'DE',
			language: 'en',
		});
	});

	test('a ConsentRoot prop that differs from the prefetch runs one init', async () => {
		const { context, transport } = await renderWith(
			defineComponent({
				setup: () => () => h(NuxtConsentRoot, { language: 'fr' }),
			}),
			{ country: 'DE', language: 'en' }
		);
		expect(transport.init).not.toHaveBeenCalled();

		start(context);
		await flushPromises();

		expect(transport.init).toHaveBeenCalledTimes(1);
		expect(transport.init.mock.calls[0]?.[0].overrides).toMatchObject({
			country: 'DE',
			language: 'fr',
		});
		expect(context.snapshot.value.translations?.language).toBe('fr');
	});
});
