/**
 * Components re-render only when the value they read changes.
 *
 * `useHasConsent()`, `useConsentInit()` and `useConsentPolicyActions()`
 * built a new array or object on every kernel update, so every component
 * reading them re-rendered when anything changed: opening the dialog
 * re-rendered all of them. Field composables such as `useConsent()` already
 * kept their value, because the kernel keeps unchanged fields' references.
 */
import type { InitOutput } from '@c15t/schema/types';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { translations as enTranslations } from '@c15t/translations/en';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import { defineComponent, h, onUpdated } from 'vue';
import type { Ref } from 'vue';

import {
	useConsent,
	useConsentActiveUI,
	useConsentInit,
	useConsentPolicyActions,
	useHasConsent,
} from '../runtime/composables';
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

const SUBSCRIBERS = 50;

const init: InitOutput = {
	branding: 'c15t',
	location: { countryCode: 'DE', regionCode: null },
	policyResolution: writePolicyResolutionWire(
		resolvePolicyRules({
			countryCode: null,
			regionCode: null,
			rules: [
				{
					categories: ['measurement', 'marketing'],
					id: 'vue_choice_policy',
					match: { fallback: true },
					model: 'opt-in',
					prompt: 'choice',
					scopeMode: 'strict',
				},
			],
		})
	),
	translations: { language: 'en', translations: enTranslations },
} as InitOutput;

const readers = {
	useConsent: () => useConsent(),
	useConsentActiveUI: () => useConsentActiveUI(),
	useConsentInit: () => useConsentInit(),
	useConsentPolicyActions: () => useConsentPolicyActions('prompt').presentation,
	useHasConsent: () => useHasConsent(),
} satisfies Record<string, () => Ref<unknown>>;

type Kind = keyof typeof readers;

const mountSubscribers = function mountSubscribers() {
	const config = {
		backendURL: 'https://consent.example',
		consentCategories: ['necessary', 'measurement', 'marketing'],
	} as ConsentConfig;
	const context = createVueConsentKernelContext({ config, prefetch: init });
	context.activeUI.value = 'banner';
	const updates = Object.fromEntries(
		Object.keys(readers).map((kind) => [kind, 0])
	) as Record<Kind, number>;

	const Subscriber = defineComponent({
		props: { kind: { required: true, type: String } },
		setup(props) {
			const kind = props.kind as Kind;
			const source = readers[kind]();
			onUpdated(() => {
				updates[kind] += 1;
			});
			return () => h('span', JSON.stringify(source.value)?.length ?? 0);
		},
	});
	const wrapper = mount(
		defineComponent({
			render: () =>
				(Object.keys(readers) as Kind[]).flatMap((kind) =>
					Array.from({ length: SUBSCRIBERS }, (_, index) =>
						h(Subscriber, { key: `${kind}-${index}`, kind })
					)
				),
		}),
		{
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
		}
	);
	return { context, updates, wrapper };
};

describe('composable re-renders', () => {
	test('opening the dialog re-renders only the components that read activeUI', async () => {
		const { context, updates, wrapper } = mountSubscribers();
		try {
			await flushPromises();
			context.activeUI.value = 'manager';
			await flushPromises();

			expect(updates).toEqual({
				useConsent: 0,
				useConsentActiveUI: SUBSCRIBERS,
				useConsentInit: 0,
				useConsentPolicyActions: 0,
				useHasConsent: 0,
			});
		} finally {
			wrapper.unmount();
			context.dispose();
		}
	});

	test('a save re-renders the components whose value changed', async () => {
		const { context, updates, wrapper } = mountSubscribers();
		try {
			await flushPromises();
			await context.kernel.commands.save({ measurement: true });
			await flushPromises();

			expect(updates.useConsent).toBe(SUBSCRIBERS);
			expect(updates.useHasConsent).toBe(SUBSCRIBERS);
			expect(updates.useConsentInit).toBe(0);
			expect(updates.useConsentPolicyActions).toBe(0);
		} finally {
			wrapper.unmount();
			context.dispose();
		}
	});
});
