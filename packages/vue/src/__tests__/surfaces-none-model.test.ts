import type { PolicyRule } from '@c15t/schema/types';
import { resolvePolicyRules } from '@c15t/schema/types';
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

/** A regime with no consent law: permitted by default, nothing owed. */
const noneRule: PolicyRule = {
	id: 'vue_world_none',
	match: { fallback: true, isDefault: true },
	model: 'none',
	prompt: 'none',
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

/** Mount every surface against a resolved `none` rule. */
const renderUnderNone = async function renderUnderNone(rule: PolicyRule) {
	const config = {
		consentCategories: ['necessary', 'measurement', 'marketing'],
		disableAnimation: true,
		hideBranding: true,
		trapFocus: false,
	} as ConsentConfig;
	const context = createVueConsentKernelContext({
		config,
		kernelConfig: {
			initialPolicyResolution: resolvePolicyRules({
				countryCode: 'US',
				regionCode: 'SD',
				rules: [rule],
			}),
			transport: {
				init: () => Promise.resolve({}),
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

describe('consent surfaces under a none rule', () => {
	test('grant every category and render nothing when no rights are owed', async () => {
		const context = await renderUnderNone(noneRule);
		const snapshot = context.snapshot.value;
		expect(snapshot.resolution.status).toBe('matched');
		expect(snapshot.policyRule.model).toBe('none');
		expect(snapshot.policyRule.rights).toEqual([]);
		expect(snapshot.promptRequirement.kind).toBe('none');
		expect(snapshot.effectivePermissions.measurement).toBe(true);
		expect(snapshot.effectivePermissions.marketing).toBe(true);

		// Even an explicit request to open the preference center shows nothing.
		context.activeUI.value = 'manager';
		await flushPromises();

		for (const testId of SURFACES) {
			expect(query(testId), testId).toBeNull();
		}
	});

	test('keep preferences reachable when the rule grants that right', async () => {
		const context = await renderUnderNone({
			...noneRule,
			rights: ['preferences'],
		});
		expect(context.snapshot.value.policyRule.rights).toEqual(['preferences']);

		// No prompt, so no banner; the trigger and link are the route in.
		expect(query('consent-banner-root')).toBeNull();
		await vi.waitFor(() => {
			expect(query('consent-dialog-trigger')).not.toBeNull();
			expect(query('consent-dialog-link')).not.toBeNull();
		});

		query('consent-dialog-trigger')?.click();
		await vi.waitFor(() => {
			expect(query('consent-dialog-root')).not.toBeNull();
		});

		// Saving under `none` records nothing; the dialog still closes. Scope the
		// click to the dialog, since the standalone widget has the same button.
		const accept = query('consent-dialog-root')?.querySelector<HTMLElement>(
			'[data-testid="consent-widget-footer-accept-all-button"]'
		);
		expect(accept).not.toBeNull();
		accept?.click();
		await vi.waitFor(() => {
			expect(query('consent-dialog-root')).toBeNull();
		});
		expect(context.snapshot.value.explicitChoice).toBeNull();
	});
});
