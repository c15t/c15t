/**
 * The Vue preference centre discloses Google Additional Consent providers:
 * name, privacy policy and a consent switch. A switch writes the CMP handle's
 * provider choice, and saving encodes it in the Additional Consent string.
 *
 * @vitest-environment jsdom
 */
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import type { InitOutput } from '@c15t/schema/types';
import { mount } from '@vue/test-utils';
import { afterEach, expect, onTestFinished, test, vi } from 'vitest';
import { createApp, ref } from 'vue';
import type { Component } from 'vue';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import { createIAB } from '../../../iab/src/index';
import IabPanel from '../runtime/components/iab-panel.vue';
import IabVendorList from '../runtime/components/iab-vendor-list.vue';
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

const global = { provide: { [symbolInit]: ref(undefined) } };
const adTechProviders = [
	{ id: 89, name: 'Example Ad Tech', policyUrl: 'https://ads.example/privacy' },
	{ id: 2577, name: 'Other Ad Tech', policyUrl: 'https://other.example/p' },
];

test('lists each provider with its privacy policy and a consent switch', () => {
	const wrapper = mount(IabVendorList, {
		global,
		props: {
			adTechProviderConsents: { '2577': true },
			adTechProviders,
			purposes: [],
			selectedVendorId: null,
			vendorConsents: {},
			vendorData: null,
		},
	});
	const row = wrapper.get('#ad-tech-provider-89');
	expect(row.text()).toContain('Example Ad Tech');
	expect(row.get('a').attributes('href')).toBe('https://ads.example/privacy');
	expect(
		wrapper.get('#ad-tech-provider-2577 [role="switch"]').attributes()
	).toMatchObject({ 'aria-checked': 'true' });
});

test('hides providers while a vendor from the Purposes tab is selected', () => {
	const wrapper = mount(IabVendorList, {
		global,
		props: {
			adTechProviders,
			purposes: [],
			selectedVendorId: 755,
			vendorConsents: {},
			vendorData: null,
		},
	});
	expect(wrapper.find('#ad-tech-provider-89').exists()).toBe(false);
});

const policy = normalizePolicyRule({
	id: 'iab-ad-tech',
	match: { isDefault: true },
	model: 'iab',
	prompt: 'choice',
});

const init = {
	branding: 'c15t',
	cmpId: 28,
	customVendors: [],
	gvl: completeGVL,
	location: { countryCode: 'DE', regionCode: null },
	policyResolution: writePolicyResolutionWire({
		fingerprints: createPolicyRuleFingerprints(policy),
		matchedBy: 'default',
		policy,
		policyId: policy.id,
		status: 'matched',
	}),
	translations: { language: 'en', translations: {} },
} as unknown as InitOutput;

const config = {
	backendURL: 'https://consent.test',
	customFetch: (() =>
		Promise.resolve(Response.json({ ok: true }))) as unknown as typeof fetch,
	disableAnimation: true,
	hideBranding: true,
	iab: {},
	trapFocus: false,
} as ConsentConfig;

afterEach(() => {
	localStorage.clear();
	vi.unstubAllGlobals();
});

/**
 * Mounts the real IAB panel over a CMP handle that loads two providers from
 * a stubbed provider list.
 *
 * @returns The kernel context the panel writes to.
 */
const mountPanel = async function mountPanel() {
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
	const context = createVueConsentKernelContext({ config, prefetch: init });
	onTestFinished(() => context.dispose());
	const handle = createIAB({
		additionalConsent: {
			providers: adTechProviders.map(({ id }) => id),
			url: 'https://lists.example/ac',
		},
		cmpId: 28,
		gvl: completeGVL,
		kernel: context.kernel,
		persistence: false,
	});
	onTestFinished(() => handle.dispose());
	context.iab = handle;
	await handle.whenReady();
	context.kernel.set.activeUI('dialog');
	const container = document.createElement('div');
	document.body.append(container);
	onTestFinished(() => container.remove());
	const app = createApp(IabPanel as Component);
	app.provide(consentConfigKey, config);
	app.provide(symbolKernelContext, context);
	app.provide(symbolKernel, context.kernel);
	app.provide(symbolSnapshot, context.snapshot);
	app.provide(symbolInit, context.init);
	app.provide(symbolActiveUI, context.activeUI);
	app.provide(symbolConsent, context.storedConsent);
	app.mount(container);
	onTestFinished(() => app.unmount());
	return { context, handle };
};

const providerSwitch = (id: number) =>
	document.querySelector<HTMLButtonElement>(
		`#ad-tech-provider-${id} [role="switch"]`
	);

test('a provider switch in the panel writes the CMP selection and saving encodes it', async () => {
	const { context, handle } = await mountPanel();
	await vi.waitFor(() =>
		expect(context.kernel.getSnapshot().iab?.adTechProviders).toHaveLength(2)
	);
	// The AC string lists a provider as consented only with purposes 1, 3, 4.
	for (const purpose of [1, 3, 4]) {
		handle.setPurposeConsent(purpose, true);
	}

	const vendorsTab = [
		...document.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
	].find((tab) => tab.textContent?.includes('Vendors'));
	vendorsTab?.click();
	await vi.waitFor(() => expect(providerSwitch(89)).not.toBeNull());
	expect(
		document
			.querySelector('#ad-tech-provider-89')
			?.closest('section')
			?.querySelector('h3')?.textContent
	).toContain('(2)');

	providerSwitch(89)?.click();
	await vi.waitFor(() =>
		expect(
			context.kernel.getSnapshot().iab?.adTechProviderConsents?.['89']
		).toBe(true)
	);
	await vi.waitFor(() =>
		expect(providerSwitch(89)?.getAttribute('aria-checked')).toBe('true')
	);

	document
		.querySelector<HTMLButtonElement>(
			'[data-testid="iab-consent-dialog-card"] [data-action="save"]'
		)
		?.click();
	await vi.waitFor(() =>
		expect(context.kernel.getSnapshot().iab?.authority?.addtlConsent).toBe(
			'2~89~dv.2577'
		)
	);
});
