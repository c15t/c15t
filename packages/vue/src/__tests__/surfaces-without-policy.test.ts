import type { InitResponse } from '@c15t/core';
import type { PolicyRule } from '@c15t/schema/types';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { ComponentPublicInstance } from 'vue';
import { defineComponent, h } from 'vue';

import ConsentBanner from '../runtime/components/consent-banner.vue';
import ConsentDialogTrigger from '../runtime/components/consent-dialog-trigger.vue';
import ConsentManager from '../runtime/components/consent-manager.vue';
import ConsentPreferencesLink from '../runtime/components/consent-preferences-link.vue';
import ConsentWidget from '../runtime/components/consent-widget.vue';
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

const choiceRule: PolicyRule = {
	id: 'vue_late_policy',
	match: { fallback: true },
	model: 'opt-in',
	prompt: 'choice',
};

const SURFACES = [
	'consent-banner-root',
	'consent-dialog-root',
	'consent-dialog-trigger',
	'consent-dialog-link',
	'consent-widget-root',
] as const;

const query = function query(testId: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
};

/** Every c15t surface mounted at once, the way a host layout would. */
const AllSurfaces = defineComponent({
	name: 'AllSurfaces',
	render: () => [
		h(ConsentBanner),
		h(ConsentManager),
		h(ConsentDialogTrigger),
		h(ConsentPreferencesLink),
		h(ConsentWidget),
	],
});

let mounted: {
	context: VueConsentKernelContext;
	wrapper: VueWrapper<ComponentPublicInstance>;
} | null = null;

/**
 * Mount the surfaces against a kernel whose resolution failed and whose
 * transport answers the next init with whatever `response` holds.
 */
const renderWithoutPolicy = async function renderWithoutPolicy() {
	let response: InitResponse = {};
	const config = {
		consentCategories: ['necessary', 'measurement', 'marketing'],
		disableAnimation: true,
		hideBranding: true,
		trapFocus: false,
	} as ConsentConfig;
	const context = createVueConsentKernelContext({
		config,
		kernelConfig: {
			initialPolicyResolution: {
				policy: null,
				reason: 'transport',
				status: 'failed',
			},
			transport: {
				init: () => Promise.resolve(response),
				recordPrivacyOptOut: () => Promise.resolve(),
				save: () => Promise.resolve({ ok: true, subjectId: 'vue-test' }),
			},
		},
	});
	const wrapper = mount(AllSurfaces, {
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
	return {
		context,
		async resolvePolicy(rule: PolicyRule) {
			response = {
				policyResolution: writePolicyResolutionWire(
					resolvePolicyRules({
						countryCode: null,
						regionCode: null,
						rules: [rule],
					})
				),
			};
			await context.kernel.commands.init();
			await flushPromises();
		},
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
});

describe('consent surfaces without a resolved policy', () => {
	test('render nothing while the resolution is not matched', async () => {
		const { context } = await renderWithoutPolicy();
		expect(context.snapshot.value.resolution.status).toBe('failed');

		// Even an explicit request to open the preference center shows nothing.
		context.activeUI.value = 'manager';
		await flushPromises();

		for (const testId of SURFACES) {
			expect(query(testId), testId).toBeNull();
		}
	});

	test('appear on their own once a later init supplies a rule', async () => {
		const { context, resolvePolicy } = await renderWithoutPolicy();
		for (const testId of SURFACES) {
			expect(query(testId), testId).toBeNull();
		}

		await resolvePolicy(choiceRule);
		expect(context.snapshot.value.resolution.status).toBe('matched');

		await vi.waitFor(() => {
			expect(query('consent-banner-root')).not.toBeNull();
			expect(query('consent-dialog-trigger')).not.toBeNull();
			expect(query('consent-dialog-link')).not.toBeNull();
			expect(query('consent-widget-root')).not.toBeNull();
		});
	});
});
