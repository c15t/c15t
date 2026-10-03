/**
 * "Accept all" and "Reject all" on the Vue IAB banner and dialog must record
 * the same selection, and encode the same TC string, as the `@c15t/iab`
 * handle's own `acceptAll()` / `rejectAll()`, which React and Svelte call.
 *
 * @vitest-environment jsdom
 */
import type { ConsentKernel, NonIABVendor } from '@c15t/core';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import type { GlobalVendorList, InitOutput } from '@c15t/schema/types';
import { afterEach, expect, onTestFinished, test, vi } from 'vitest';
import { createApp } from 'vue';
import type { Component } from 'vue';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import { createIAB } from '../../../iab/src/index';
import type { IABHandle } from '../../../iab/src/index';
import { decodeTCString } from '../../../iab/src/tcf/tc-string';
import IabPanel from '../runtime/components/iab-panel.vue';
import IabPrompt from '../runtime/components/iab-prompt.vue';
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

const CMP_ID = 28;

const { 10: vendor10 } = completeGVL.vendors;
if (!vendor10) {
	throw new Error('Missing vendor 10 fixture');
}

// Vendor 10 declares legitimate interest only, so it has no consent switch.
const gvl: GlobalVendorList = {
	...completeGVL,
	vendors: { ...completeGVL.vendors, 10: { ...vendor10, purposes: [] } },
};

const customVendors: NonIABVendor[] = [
	{
		id: 'custom-analytics',
		legIntPurposes: [],
		name: 'Custom Analytics',
		privacyPolicyUrl: 'https://example.test/privacy',
		purposes: [1, 8],
	},
	{
		id: 'custom-li-only',
		legIntPurposes: [9],
		name: 'Custom LI only',
		privacyPolicyUrl: 'https://example.test/privacy',
		purposes: [],
	},
];

// Vendor 755 must use legitimate interest for purpose 7.
const publisherRestrictions = [
	{ purposeId: 7, restrictionType: 2 as const, vendorIds: [755] },
];

const policy = normalizePolicyRule({
	id: 'iab-blanket',
	match: { isDefault: true },
	model: 'iab',
	prompt: 'choice',
});

const init: InitOutput = {
	branding: 'c15t',
	cmpId: CMP_ID,
	customVendors,
	gvl,
	location: { countryCode: 'DE', regionCode: null },
	policyResolution: writePolicyResolutionWire({
		fingerprints: createPolicyRuleFingerprints(policy),
		matchedBy: 'default',
		policy,
		policyId: policy.id,
		status: 'matched',
	}),
	translations: { language: 'en', translations: {} },
} as InitOutput;

// The backend accepts every save; only the local record matters here.
const acceptSave = ((_input: RequestInfo | URL, request?: RequestInit) =>
	Promise.resolve(
		Response.json({
			ok: true,
			subjectId: (
				JSON.parse(String(request?.body ?? '{}')) as {
					subjectId?: string;
				}
			).subjectId,
		})
	)) as typeof fetch;

const config = {
	backendURL: 'https://consent.test',
	customFetch: acceptSave,
	disableAnimation: true,
	hideBranding: true,
	trapFocus: false,
} as ConsentConfig;

afterEach(() => {
	localStorage.clear();
});

const createHandle = (kernel: ConsentKernel): IABHandle => {
	const handle = createIAB({
		cmpId: CMP_ID,
		customVendors,
		gvl,
		kernel,
		persistence: false,
		publisherRestrictions,
	});
	onTestFinished(() => handle.dispose());
	return handle;
};

const selectionOf = (kernel: ConsentKernel) => {
	const { iab } = kernel.getSnapshot();
	return {
		purposeConsents: iab?.purposeConsents,
		purposeLegitimateInterests: iab?.purposeLegitimateInterests,
		specialFeatureOptIns: iab?.specialFeatureOptIns,
		vendorConsents: iab?.vendorConsents,
		vendorLegitimateInterests: iab?.vendorLegitimateInterests,
	};
};

const decodedChoices = async (tcString: string | null | undefined) => {
	if (!tcString) {
		throw new Error('Expected a TC string');
	}
	const decoded = await decodeTCString(tcString);
	return {
		purposeConsents: decoded.purposeConsents,
		purposeLegitimateInterests: decoded.purposeLegitimateInterests,
		specialFeatureOptIns: decoded.specialFeatureOptIns,
		vendorConsents: decoded.vendorConsents,
		vendorLegitimateInterests: decoded.vendorLegitimateInterests,
		vendorsDisclosed: decoded.vendorsDisclosed,
	};
};

/** What the handle records when a caller uses it directly, as React does. */
const recordThroughHandle = async (action: 'accept' | 'reject') => {
	const context = createVueConsentKernelContext({ config, prefetch: init });
	onTestFinished(() => context.dispose());
	const handle = createHandle(context.kernel);
	await handle.whenReady();
	if (action === 'accept') {
		handle.acceptAll();
	} else {
		handle.rejectAll();
	}
	await handle.save();
	return {
		selection: selectionOf(context.kernel),
		tcString: context.kernel.getSnapshot().iab?.authority?.tcString,
	};
};

/** What a visitor records by clicking the Vue surface. */
const recordThroughClick = async (
	surface: 'banner' | 'dialog',
	action: 'accept' | 'reject'
) => {
	const context = createVueConsentKernelContext({ config, prefetch: init });
	onTestFinished(() => context.dispose());
	context.iab = createHandle(context.kernel);
	await context.iab.whenReady?.();
	context.kernel.set.activeUI(surface);

	const container = document.createElement('div');
	document.body.append(container);
	onTestFinished(() => container.remove());
	const app = createApp(
		(surface === 'banner' ? IabPrompt : IabPanel) as Component
	);
	app.provide(consentConfigKey, config);
	app.provide(symbolKernelContext, context);
	app.provide(symbolKernel, context.kernel);
	app.provide(symbolSnapshot, context.snapshot);
	app.provide(symbolInit, context.init);
	app.provide(symbolActiveUI, context.activeUI);
	app.provide(symbolConsent, context.storedConsent);
	app.mount(container);
	onTestFinished(() => app.unmount());

	const button = () =>
		document.querySelector<HTMLButtonElement>(
			surface === 'banner'
				? `[data-testid="iab-consent-banner-${action}-button"]`
				: `[data-testid="iab-consent-dialog-card"] [data-action="${action}"]`
		);
	await vi.waitFor(() => expect(button()).not.toBeNull());
	button()?.click();
	await vi.waitFor(() =>
		expect(context.kernel.getSnapshot().iab?.authority?.tcString).toBeTruthy()
	);
	return {
		selection: selectionOf(context.kernel),
		tcString: context.kernel.getSnapshot().iab?.authority?.tcString,
	};
};

test.each([
	['banner', 'accept'],
	['banner', 'reject'],
	['dialog', 'accept'],
	['dialog', 'reject'],
] as const)(
	'the Vue IAB %s records %s all exactly as the IAB handle does',
	async (surface, action) => {
		const expected = await recordThroughHandle(action);
		const clicked = await recordThroughClick(surface, action);

		expect(clicked.selection).toEqual(expected.selection);
		expect(await decodedChoices(clicked.tcString)).toEqual(
			await decodedChoices(expected.tcString)
		);
	}
);

test.each(['banner', 'dialog'] as const)(
	'reject all on the Vue IAB %s refuses Purpose 1',
	async (surface) => {
		const clicked = await recordThroughClick(surface, 'reject');

		expect(clicked.selection.purposeConsents?.[1]).toBe(false);
		const decoded = await decodedChoices(clicked.tcString);
		expect(decoded.purposeConsents[1]).not.toBe(true);
		expect(Object.values(decoded.purposeConsents)).not.toContain(true);
		expect(Object.values(decoded.vendorConsents)).not.toContain(true);
	}
);
