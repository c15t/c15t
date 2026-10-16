/**
 * The Svelte preference centre discloses Google Additional Consent
 * providers: name, privacy policy and a consent switch. A switch writes the
 * CMP handle's provider choice, and saving encodes it in the Additional
 * Consent string.
 */
import { custom } from '@c15t/core';
import type { ConsentKernel } from '@c15t/core';
import { resolvePolicyRules } from '@c15t/schema/types';
import { render } from '@testing-library/svelte';
import { mount, unmount } from 'svelte';
import { expect, onTestFinished, test, vi } from 'vitest';
// The IAB components load this package lazily. Importing it here makes Vite
// transform it while it collects this file, not inside `vi.waitFor`.
import '@c15t/iab';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import IABVendorList from '../lib/components/iab-vendor-list.svelte';
import { getIABTranslations } from '../lib/iab-translations';
import ConformanceFixture from './fixtures/conformance-fixture.svelte';

const adTechProviders = [
	{ id: 89, name: 'Example Ad Tech', policyUrl: 'https://ads.example/privacy' },
	{ id: 2577, name: 'Other Ad Tech', policyUrl: 'https://other.example/p' },
];

test('lists each provider with its privacy policy and a consent switch', () => {
	const { container } = render(IABVendorList, {
		adTechProviderConsents: { '2577': true },
		adTechProviders,
		iabT: getIABTranslations(),
		onAdTechProviderToggle: vi.fn(),
		onClearSelection: vi.fn(),
		onVendorToggle: vi.fn(),
		purposes: [],
		selectedVendorId: null,
		vendorConsents: {},
		vendorData: null,
	});
	const row = container.querySelector('#ad-tech-provider-89');
	expect(row?.textContent).toContain('Example Ad Tech');
	expect(row?.querySelector('a')?.getAttribute('href')).toBe(
		'https://ads.example/privacy'
	);
	expect(container.textContent).toContain('Google Ad Tech Providers');
	expect(
		container
			.querySelector('#ad-tech-provider-2577 [role="switch"]')
			?.getAttribute('aria-checked')
	).toBe('true');
});

test('a provider switch in the dialog writes the CMP selection and saving encodes it', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(() =>
			Promise.resolve(
				Response.json({
					providers: Object.fromEntries(
						adTechProviders.map((provider) => [String(provider.id), provider])
					),
				})
			)
		)
	);
	onTestFinished(() => {
		vi.unstubAllGlobals();
	});
	const target = document.createElement('div');
	onTestFinished(() => target.remove());
	document.body.append(target);
	let kernel: ConsentKernel | undefined;
	const mounted: { app?: ReturnType<typeof mount> } = {};
	onTestFinished(async () => {
		if (mounted.app) {
			await unmount(mounted.app);
		}
	});
	mounted.app = mount(ConformanceFixture, {
		props: {
			component: 'iab-consent-dialog',
			onKernel: (value) => {
				kernel = value;
			},
			options: {
				disableAnimation: true,
				iab: {
					additionalConsent: {
						providers: adTechProviders.map(({ id }) => id),
						url: 'https://lists.example/ac',
					},
					cmpId: 28,
					gvl: completeGVL,
				},
				mode: custom({}),
				persistence: false,
				prefetch: {
					initialPolicyResolution: resolvePolicyRules({
						countryCode: 'DE',
						regionCode: null,
						rules: [
							{
								id: 'iab',
								match: { isDefault: true },
								model: 'iab',
								prompt: 'choice',
							},
						],
					}),
				},
			},
		},
		target,
	});
	const providerSwitch = (id: number) =>
		document.querySelector<HTMLButtonElement>(
			`#ad-tech-provider-${id} [role="switch"]`
		);

	await vi.waitFor(() =>
		expect(kernel?.getSnapshot().iab?.adTechProviders).toHaveLength(2)
	);
	kernel?.set.activeUI('dialog');

	const vendorsTab = () =>
		[...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
			(tab) => tab.textContent?.includes('Vendors')
		);
	await vi.waitFor(() => expect(vendorsTab()).toBeDefined());
	vendorsTab()?.click();
	await vi.waitFor(() => expect(providerSwitch(89)).not.toBeNull());

	providerSwitch(89)?.click();
	await vi.waitFor(() =>
		expect(kernel?.getSnapshot().iab?.adTechProviderConsents?.['89']).toBe(true)
	);
	await vi.waitFor(() =>
		expect(providerSwitch(89)?.getAttribute('aria-checked')).toBe('true')
	);

	// The AC string lists a provider as consented only with purposes 1, 3, 4.
	// Those switches live under stacks on the purposes tab, so set them on
	// the kernel's selection the dialog saves from.
	kernel?.set.iab({
		purposeConsents: {
			...kernel.getSnapshot().iab?.purposeConsents,
			1: true,
			3: true,
			4: true,
		},
	});

	document
		.querySelector<HTMLButtonElement>(
			'[data-testid="iab-consent-dialog-root"] [data-action="customize"]'
		)
		?.click();
	await vi.waitFor(() =>
		expect(kernel?.getSnapshot().iab?.authority?.addtlConsent).toBe(
			'2~89~dv.2577'
		)
	);
});
