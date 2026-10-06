/**
 * The Vue IAB dialog edits the CMP handle's selection live, as React and
 * Svelte do: a switch writes the kernel's IAB selection at once, closing the
 * dialog keeps it, and saving encodes what the switches left.
 *
 * @vitest-environment jsdom
 */
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import type { InitOutput } from '@c15t/schema/types';
import { afterEach, expect, onTestFinished, test, vi } from 'vitest';
import { createApp } from 'vue';
import type { Component } from 'vue';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import { createIAB } from '../../../iab/src/index';
import { decodeTCString } from '../../../iab/src/tcf/tc-string';
import IabPanel from '../runtime/components/iab-panel.vue';
import { consentConfigKey } from '../runtime/composables/config';
import type { ConsentConfig } from '../runtime/config';
import { createVueConsentKernelContext } from '../runtime/kernel';
import {
	symbolActiveUI,
	symbolConsent,
	symbolInit,
	symbolKernel,
	symbolKernelContext,
	symbolSnapshot,
} from '../runtime/utils/symbols';

const policy = normalizePolicyRule({
	id: 'iab-live',
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
	trapFocus: false,
} as ConsentConfig;

afterEach(() => {
	localStorage.clear();
});

const mountPanel = async () => {
	const context = createVueConsentKernelContext({ config, prefetch: init });
	onTestFinished(() => context.dispose());
	const handle = createIAB({
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
	return { context };
};

const purposeSwitch = () =>
	document.querySelector<HTMLButtonElement>(
		'[data-testid="purpose-item-1"] [role="switch"]'
	);

test('a purpose switch writes the handle selection at once and closing keeps it', async () => {
	const { context } = await mountPanel();
	await vi.waitFor(() => expect(purposeSwitch()).not.toBeNull());
	expect(context.kernel.getSnapshot().iab?.purposeConsents[1]).not.toBe(true);

	purposeSwitch()?.click();
	await vi.waitFor(() =>
		expect(context.kernel.getSnapshot().iab?.purposeConsents[1]).toBe(true)
	);

	context.kernel.set.activeUI('none');
	await vi.waitFor(() => expect(purposeSwitch()).toBeNull());
	context.kernel.set.activeUI('dialog');
	await vi.waitFor(() =>
		expect(purposeSwitch()?.getAttribute('aria-checked')).toBe('true')
	);
	expect(context.kernel.getSnapshot().iab?.purposeConsents[1]).toBe(true);

	document
		.querySelector<HTMLButtonElement>(
			'[data-testid="iab-consent-dialog-card"] [data-action="save"]'
		)
		?.click();
	await vi.waitFor(() =>
		expect(context.kernel.getSnapshot().iab?.authority?.tcString).toBeTruthy()
	);
	const decoded = await decodeTCString(
		context.kernel.getSnapshot().iab?.authority?.tcString ?? ''
	);
	expect(decoded.purposeConsents[1]).toBe(true);
});
