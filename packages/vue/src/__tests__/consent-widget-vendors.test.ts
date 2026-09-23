/**
 * Vendor rows nested under a category in the Vue consent widget.
 *
 * A vendor switch stages a per-vendor grant on the same draft as the
 * category switches; nothing is recorded until Save. Saving with one vendor
 * off denies exactly that vendor and keeps the category granted. A category
 * that is off in the draft disables its vendor switches. Accept all clears
 * the denial. The markup mirrors the React rows so parity holds.
 */
import type {
	InitOutput,
	PolicyRule,
	TranslationsResponse,
} from '@c15t/schema/types';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import preferenceItemStyles from '@c15t/ui/styles/components/preference-item';
import switchStyles from '@c15t/ui/styles/components/switch';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import type { ComponentPublicInstance } from 'vue';

import ConsentWidget from '../runtime/components/preferences.vue';
import { consentConfigKey } from '../runtime/composables/config';
import type { ConsentConfig } from '../runtime/config';
import { createVueConsentKernelContext } from '../runtime/kernel';
import type {
	RuntimeConsentConfig,
	VueConsentKernelContext,
} from '../runtime/kernel';
import {
	symbolActiveUI,
	symbolConsent,
	symbolInit,
	symbolKernel,
	symbolKernelContext,
	symbolSnapshot,
} from '../runtime/utils/symbols';

const VENDORS: RuntimeConsentConfig['vendors'] = [
	{
		category: 'marketing',
		description: 'Ad conversion measurement.',
		id: 'meta-pixel',
		name: 'Meta Pixel',
		privacyPolicyUrl: 'https://www.facebook.com/privacy/policy/',
	},
	{
		category: 'marketing',
		id: 'google-ads',
		name: 'Google Ads',
		privacyPolicyUrl: 'https://policies.google.com/privacy',
	},
	{
		category: 'measurement',
		id: 'google-analytics',
		name: 'Google Analytics',
		privacyPolicyUrl: 'https://policies.google.com/privacy',
	},
	{
		category: { or: ['marketing', 'measurement'] },
		id: 'shared-vendor',
		name: 'Shared Vendor',
		privacyPolicyUrl: 'https://example.com/privacy',
	},
	{
		category: { not: 'marketing' },
		id: 'negated-vendor',
		name: 'Negated Vendor',
		privacyPolicyUrl: 'https://example.com/privacy',
	},
	{
		category: 'marketing',
		disabled: true,
		id: 'fixed-vendor',
		name: 'Fixed Vendor',
		privacyPolicyUrl: 'https://example.com/privacy',
	},
];

const rule: PolicyRule = {
	categories: ['marketing', 'measurement'],
	id: 'vue_vendor_policy',
	match: { fallback: true },
	model: 'opt-in',
	prompt: 'choice',
	scopeMode: 'permissive',
};
// The wire takes the raw rule; the receipts carry the normalized rule's
// fingerprint, which is what the kernel compares against.
const fingerprints = createPolicyRuleFingerprints(normalizePolicyRule(rule));

const initFor = (translations: TranslationsResponse): InitOutput => ({
	branding: 'c15t',
	jurisdiction: 'GDPR',
	location: { countryCode: 'DE', regionCode: null },
	policyResolution: writePolicyResolutionWire(
		resolvePolicyRules({ countryCode: null, regionCode: null, rules: [rule] })
	),
	translations: { language: 'en', translations },
});

const choiceRecords = (values: Record<string, boolean>) => ({
	choice: {
		categories: Object.fromEntries(
			Object.entries(values).map(([category, value]) => [
				category,
				{
					basis: {
						fingerprint: fingerprints.choice,
						kind: 'choice-v1' as const,
					},
					confirmedAt: Date.now(),
					value,
				},
			])
		),
		version: 3 as const,
	},
	now: Date.now(),
});

/** The partial translations branch: every field optional, as an older backend sends. */
const PARTIAL_TRANSLATIONS: TranslationsResponse = {
	common: {},
	consentManagerDialog: {},
	consentTypes: {},
	cookieBanner: {},
};

const renderWidget = async function renderWidget(
	values: Record<string, boolean>,
	translations: TranslationsResponse = PARTIAL_TRANSLATIONS,
	noStyle = false
) {
	const config = {
		backendURL: 'https://consent.example',
		consentCategories: ['necessary', 'marketing', 'measurement'],
		disableAnimation: true,
		vendors: VENDORS,
	} as ConsentConfig;
	const context = createVueConsentKernelContext({
		config,
		initialRecords: choiceRecords(values),
		prefetch: initFor(translations),
		producerContract: 1,
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
		props: { noStyle },
	});
	await flushPromises();
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

const byTestId = (id: string) =>
	document.querySelector<HTMLElement>(`[data-testid="${id}"]`);

const open = async (category: string) => {
	byTestId(`consent-widget-accordion-trigger-${category}`)?.click();
	await flushPromises();
};

describe('Vue consent widget vendor rows', () => {
	test('lists a category’s vendors as cards and denies exactly the one turned off', async () => {
		const { context, wrapper } = await renderWidget({
			marketing: true,
			measurement: true,
		});
		try {
			await open('marketing');
			const list = byTestId('consent-widget-vendor-list-marketing');
			expect(list?.getAttribute('aria-label')).toBe('Vendors (4)');
			expect(
				list?.querySelector(
					'[data-testid="consent-widget-vendor-item-measurement-google-analytics"]'
				)
			).toBeNull();
			expect(
				byTestId('consent-widget-vendor-list-measurement')?.querySelector(
					'[data-testid="consent-widget-vendor-item-measurement-google-analytics"]'
				)
			).not.toBeNull();

			const trigger = byTestId(
				'consent-widget-vendor-trigger-marketing-meta-pixel'
			);
			const content = byTestId(
				'consent-widget-vendor-content-marketing-meta-pixel'
			);
			expect(trigger?.getAttribute('aria-expanded')).toBe('false');
			expect(content?.getAttribute('data-state')).toBe('closed');
			trigger?.click();
			await flushPromises();
			expect(trigger?.getAttribute('aria-expanded')).toBe('true');
			expect(content?.textContent).toContain('Ad conversion measurement.');
			expect(content?.textContent).toContain('Privacy policy');

			const meta = byTestId(
				'consent-widget-vendor-switch-marketing-meta-pixel'
			);
			expect(meta?.getAttribute('aria-label')).toBe('Allow Meta Pixel');
			expect(meta?.getAttribute('aria-checked')).toBe('true');
			// The switch is described by the name span, addressable by test id.
			const describedBy = meta?.getAttribute('aria-describedby') ?? '';
			expect(
				document.getElementById(describedBy)?.getAttribute('data-testid')
			).toBe('consent-widget-vendor-name-marketing-meta-pixel');
			meta?.click();
			await flushPromises();
			expect(meta?.getAttribute('aria-checked')).toBe('false');
			// A draft toggle records nothing.
			expect(context.kernel.getSnapshot().vendorChoice).toBeNull();

			byTestId('consent-widget-footer-save-button')?.click();
			await flushPromises();
			await new Promise((resolve) => {
				setTimeout(resolve, 0);
			});
			const snapshot = context.kernel.getSnapshot();
			expect(snapshot.vendorChoice?.denied).toEqual(['meta-pixel']);
			expect(snapshot.effectivePermissions.marketing).toBe(true);
		} finally {
			await cleanup(wrapper, context);
		}
	});

	test('disables vendor switches while the category is off and re-enables them', async () => {
		const { context, wrapper } = await renderWidget({
			marketing: false,
			measurement: true,
		});
		try {
			await open('marketing');
			const meta = byTestId(
				'consent-widget-vendor-switch-marketing-meta-pixel'
			);
			expect(meta?.hasAttribute('disabled')).toBe(true);
			expect(byTestId('consent-widget-vendor-hint-marketing')).not.toBeNull();
			byTestId('consent-widget-switch-marketing')?.click();
			await flushPromises();
			expect(meta?.hasAttribute('disabled')).toBe(false);
			expect(byTestId('consent-widget-vendor-hint-marketing')).toBeNull();
		} finally {
			await cleanup(wrapper, context);
		}
	});

	test('a disabled vendor has no switch and a negated one is not listed', async () => {
		const { context, wrapper } = await renderWidget({
			marketing: true,
			measurement: true,
		});
		try {
			await open('marketing');
			expect(
				byTestId('consent-widget-vendor-item-marketing-fixed-vendor')
					?.textContent
			).toContain('Fixed Vendor');
			expect(
				byTestId('consent-widget-vendor-switch-marketing-fixed-vendor')
			).toBeNull();
			expect(
				byTestId('consent-widget-vendor-item-marketing-negated-vendor')
			).toBeNull();
			// A shared vendor gets a distinct label id per category.
			const ids = [...document.querySelectorAll('[id$="-shared-vendor"]')].map(
				(element) => element.id
			);
			expect(new Set(ids).size).toBe(2);
		} finally {
			await cleanup(wrapper, context);
		}
	});

	test('accept all discards a staged vendor denial instead of recording it', async () => {
		const { context, wrapper } = await renderWidget({
			marketing: true,
			measurement: true,
		});
		try {
			await open('marketing');
			byTestId('consent-widget-vendor-switch-marketing-meta-pixel')?.click();
			await flushPromises();
			byTestId('consent-widget-footer-accept-all-button')?.click();
			await flushPromises();
			await new Promise((resolve) => {
				setTimeout(resolve, 0);
			});
			expect(context.kernel.getSnapshot().vendorChoice?.denied ?? []).toEqual(
				[]
			);
			expect(
				byTestId(
					'consent-widget-vendor-switch-marketing-meta-pixel'
				)?.getAttribute('aria-checked')
			).toBe('true');
		} finally {
			await cleanup(wrapper, context);
		}
	});

	test('a vendor declared later reseeds a clean draft and stales a dirty one', async () => {
		const { context, wrapper } = await renderWidget({
			marketing: true,
			measurement: true,
		});
		try {
			const late = {
				category: 'marketing' as const,
				id: 'late-vendor',
				name: 'Late',
				presentable: true,
				privacyPolicyUrl: 'https://example.com/privacy',
				source: 'config' as const,
			};
			// Nothing moved: a module declaring a slug must not tell the visitor
			// the policy changed. The new card appears and Save stays enabled.
			context.kernel.set.vendors({ declared: [late] });
			await flushPromises();
			expect(document.querySelector('[role="status"]')).toBeNull();
			expect(
				byTestId('consent-widget-footer-save-button')?.hasAttribute('disabled')
			).toBe(false);
			await open('marketing');
			expect(
				byTestId('consent-widget-vendor-item-marketing-late-vendor')
			).not.toBeNull();

			// Dirty: the visitor was looking at a different list, so review.
			byTestId('consent-widget-vendor-switch-marketing-meta-pixel')?.click();
			await flushPromises();
			context.kernel.set.vendors({
				declared: [{ ...late, id: 'later-vendor' }],
			});
			await flushPromises();
			expect(document.querySelector('[role="status"]')).not.toBeNull();
			expect(
				byTestId('consent-widget-footer-save-button')?.hasAttribute('disabled')
			).toBe(true);
		} finally {
			await cleanup(wrapper, context);
		}
	});

	test('the switches and vendor cards use the class maps that ship their CSS', async () => {
		// `@c15t/ui/styles/components/*` entries import their stylesheet as a
		// side effect, so a Nuxt app that never loads the aggregated
		// stylesheet still gets a sized switch and a collapsing card. The
		// `@c15t/ui/styles/primitives` variants map to CSS that only ships in
		// that aggregate, which left both unstyled in Nuxt.
		const { context, wrapper } = await renderWidget({
			marketing: true,
			measurement: true,
		});
		try {
			await open('marketing');
			for (const id of [
				'consent-widget-switch-marketing',
				'consent-widget-vendor-switch-marketing-meta-pixel',
			]) {
				const control = byTestId(id);
				expect(control?.getAttribute('data-size')).toBe('small');
				expect(control?.classList.contains(switchStyles.root)).toBe(true);
				expect(
					control
						?.querySelector('[data-slot="switch-track"]')
						?.classList.contains(switchStyles.track)
				).toBe(true);
				expect(
					control
						?.querySelector('[data-slot="switch-thumb"]')
						?.classList.contains(switchStyles.thumb)
				).toBe(true);
			}
			const item = byTestId('consent-widget-vendor-item-marketing-meta-pixel');
			expect(item?.classList.contains(preferenceItemStyles.root)).toBe(true);
			expect(
				byTestId(
					'consent-widget-vendor-content-marketing-meta-pixel'
				)?.classList.contains(preferenceItemStyles.content)
			).toBe(true);
		} finally {
			await cleanup(wrapper, context);
		}
	});

	test('noStyle drops the built-in classes from the vendor cards', async () => {
		const { context, wrapper } = await renderWidget(
			{ marketing: true, measurement: true },
			PARTIAL_TRANSLATIONS,
			true
		);
		try {
			await open('marketing');
			const item = byTestId('consent-widget-vendor-item-marketing-meta-pixel');
			expect(item?.className ?? '').toBe('');
			const trigger = byTestId(
				'consent-widget-vendor-trigger-marketing-meta-pixel'
			);
			expect(trigger?.className ?? '').toBe('');
			const content = byTestId(
				'consent-widget-vendor-content-marketing-meta-pixel'
			);
			expect(content?.className ?? '').toBe('');
			expect(
				content?.querySelector('[data-slot="preference-item-content-inner"]')
					?.className ?? ''
			).toBe('');
		} finally {
			await cleanup(wrapper, context);
		}
	});

	test('translated vendor copy overrides the defaults', async () => {
		const { context, wrapper } = await renderWidget(
			{ marketing: true, measurement: true },
			{
				...PARTIAL_TRANSLATIONS,
				consentManagerDialog: {
					vendors: {
						privacyPolicy: 'Datenschutz',
						title: 'Anbieter ({count})',
					},
				},
			}
		);
		try {
			await open('marketing');
			expect(
				byTestId('consent-widget-vendor-list-marketing')?.getAttribute(
					'aria-label'
				)
			).toBe('Anbieter (4)');
			byTestId('consent-widget-vendor-trigger-marketing-meta-pixel')?.click();
			await flushPromises();
			expect(
				byTestId('consent-widget-vendor-content-marketing-meta-pixel')
					?.textContent
			).toContain('Datenschutz');
		} finally {
			await cleanup(wrapper, context);
		}
	});
});
