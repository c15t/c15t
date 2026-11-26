/**
 * The restriction notice explains why a saved grant is not in effect.
 * An unsaved draft toggle must not trigger it, and a category GPC denies
 * with no saved choice renders off with no notice.
 *
 * @vitest-environment jsdom
 */
import type { AllConsentNames, ExplicitChoice } from '@c15t/core';
import type { PolicyRule } from '@c15t/schema/types';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
} from '@c15t/schema/types';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, test } from 'vitest';
import type { ComponentPublicInstance } from 'vue';

import ConsentWidget from '../runtime/components/preferences.vue';
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
import type { VueConsentKernelContext } from './test-kernel';

const CATEGORIES: AllConsentNames[] = ['necessary', 'marketing', 'measurement'];

const restriction = (name: string) =>
	document.querySelector(`[data-testid="consent-widget-restriction-${name}"]`);

let mounted: {
	context: VueConsentKernelContext;
	wrapper: VueWrapper<ComponentPublicInstance>;
} | null = null;

const renderWidget = async function renderWidget(options: {
	rule: Partial<PolicyRule>;
	gpc?: boolean;
	saved?: Partial<Record<'marketing' | 'measurement', boolean>>;
}) {
	const now = Date.now();
	const policy = normalizePolicyRule({
		categories: ['marketing', 'measurement'],
		id: 'vue-restriction-test',
		match: { isDefault: true },
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: 'strict',
		...options.rule,
	});
	const fingerprints = createPolicyRuleFingerprints(policy);
	const choice: ExplicitChoice | undefined = options.saved
		? {
				categories: Object.fromEntries(
					Object.entries(options.saved).map(([name, value]) => [
						name,
						{
							basis: {
								fingerprint: fingerprints.choice,
								kind: 'choice-v1' as const,
							},
							confirmedAt: now - 1,
							value,
						},
					])
				),
				version: 3,
			}
		: undefined;

	const config = {
		consentCategories: CATEGORIES,
		disableAnimation: true,
		hideBranding: true,
	} as ConsentConfig;
	const context = createVueConsentKernelContext({
		config,
		kernelConfig: {
			initialOverrides: options.gpc ? { gpc: true } : undefined,
			initialPolicyResolution: {
				fingerprints,
				matchedBy: 'default',
				policy,
				policyId: policy.id,
				status: 'matched',
			},
			initialRecords: choice ? { choice, now } : undefined,
			now,
			transport: {
				init: () => Promise.resolve({}),
				save: () => Promise.resolve({ ok: true, subjectId: 'vue-test' }),
			},
		},
	});
	const wrapper = mount(ConsentWidget, {
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
	return { context, wrapper };
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

describe('Vue consent widget restriction notice and GPC seeding', () => {
	test('does not appear when a draft toggle is switched on before saving', async () => {
		await renderWidget({ rule: { model: 'opt-in' } });
		const marketing = document.querySelector<HTMLButtonElement>(
			'[data-testid="consent-widget-switch-marketing"]'
		);
		expect(marketing?.getAttribute('aria-checked')).toBe('false');
		marketing?.click();
		await flushPromises();
		expect(marketing?.getAttribute('aria-checked')).toBe('true');
		expect(restriction('marketing')).toBeNull();
		expect(marketing?.hasAttribute('aria-describedby')).toBe(false);
	});

	test('appears below the row for a saved grant that GPC overrides', async () => {
		await renderWidget({
			gpc: true,
			rule: {
				model: 'opt-in',
				privacySignals: { gpc: { denyCategories: ['marketing'] } },
			},
			saved: { marketing: true, measurement: true },
		});

		const notice = restriction('marketing');
		expect(notice).not.toBeNull();
		expect(notice?.textContent).toContain('restricted');

		const row = document.querySelector(
			'[data-testid="consent-widget-accordion-trigger-marketing"]'
		);
		expect(row?.contains(notice)).toBe(false);

		const marketing = document.querySelector(
			'[data-testid="consent-widget-switch-marketing"]'
		);
		expect(marketing?.getAttribute('aria-checked')).toBe('true');
		expect(marketing?.getAttribute('aria-describedby')).toBe(notice?.id);

		expect(restriction('measurement')).toBeNull();
	});

	test('shows a GPC-denied opt-out category off with no notice when nothing is recorded', async () => {
		await renderWidget({
			gpc: true,
			rule: {
				model: 'opt-out',
				privacySignals: { gpc: { denyCategories: ['marketing'] } },
			},
		});

		const marketing = document.querySelector(
			'[data-testid="consent-widget-switch-marketing"]'
		);
		const measurement = document.querySelector(
			'[data-testid="consent-widget-switch-measurement"]'
		);
		expect(marketing?.getAttribute('aria-checked')).toBe('false');
		expect(measurement?.getAttribute('aria-checked')).toBe('true');
		expect(restriction('marketing')).toBeNull();
	});
});
