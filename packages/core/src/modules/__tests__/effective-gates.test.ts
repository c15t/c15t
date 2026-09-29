/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	choiceRecords,
	DAY,
	iabRule,
	matchedResolution,
	NOW,
	optInRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../kernel';
import { hasGlobalPrivacyControlSignal } from '../../libs/global-privacy-control';
import type {
	ConsentKernel,
	GlobalVendorList,
	KernelIABAuthority,
} from '../../types';
import { evaluateConsent } from '../has';
import { createIframeBlocker } from '../iframe-blocker';
import { createNetworkBlocker } from '../network-blocker';
import { createScriptLoader } from '../script-loader';

const disposers: (() => void)[] = [];
beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
});
afterEach(() => {
	for (const dispose of disposers.splice(0)) {
		dispose();
	}
	document.body.innerHTML = '';
	document.head.innerHTML = '';
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

const categoryKernel = function categoryKernel() {
	const resolution = matchedResolution(
		optInRule({ validity: { choiceDays: 1 } })
	);
	const kernel = createConsentKernel({
		initialPolicyResolution: resolution,
		initialRecords: choiceRecords(
			{ marketing: true, measurement: true },
			{
				confirmedAt: NOW,
				fingerprint: resolution.fingerprints.choice,
				now: NOW,
			}
		),
		now: NOW,
	});
	disposers.push(() => kernel.dispose());
	return kernel;
};

const installAuthority = function installAuthority(
	kernel: ConsentKernel,
	patch: Partial<KernelIABAuthority> = {}
) {
	const authority: KernelIABAuthority = {
		choiceFingerprint: kernel.getSnapshot().evaluationPolicy.choice.fingerprint,
		confirmedAt: NOW,
		expiresAt: NOW + DAY,
		purposeConsents: { 1: true },
		purposeLegitimateInterests: {},
		specialFeatureOptIns: {},
		tcString: 'validated-by-addon',
		vendorConsents: { '755': true },
		vendorLegitimateInterests: {},
		...patch,
	};
	kernel.set.iab({ authority });
	return authority;
};

describe('effective category gates', () => {
	test('expired read denies without changing snapshot, callbacks or transport', () => {
		const kernel = categoryKernel();
		const snapshot = kernel.getSnapshot();
		const subscriber = vi.fn();
		const events = vi.fn();
		kernel.subscribe(subscriber);
		kernel.events.on('permissions:changed', events);
		kernel.events.on('choice:recorded', events);
		const write = vi.spyOn(Storage.prototype, 'setItem');
		vi.setSystemTime(NOW + DAY);
		expect(evaluateConsent({ category: 'measurement' }, snapshot)).toBe(false);
		expect(kernel.getSnapshot()).toBe(snapshot);
		expect(snapshot.effectivePermissions.measurement).toBe(true);
		expect(subscriber).not.toHaveBeenCalled();
		expect(events).not.toHaveBeenCalled();
		expect(write).not.toHaveBeenCalled();
		write.mockRestore();
	});

	test('lifecycle deadline removes script and iframe, then a new confirmation restores both', async () => {
		const kernel = categoryKernel();
		const iframe = document.createElement('iframe');
		iframe.setAttribute('data-category', 'measurement');
		iframe.setAttribute('data-src', 'https://example.test/embed');
		document.body.appendChild(iframe);
		const scripts = createScriptLoader({
			kernel,
			scripts: [
				{
					anonymizeId: false,
					category: 'measurement',
					id: 'analytics',
					src: 'https://example.test/a.js',
				},
			],
		});
		const iframes = createIframeBlocker({ kernel });
		disposers.push(scripts.dispose, iframes.dispose);
		await kernel.commands.init();
		expect(document.querySelector('script')).not.toBeNull();
		expect(iframe.hasAttribute('src')).toBe(true);
		await vi.advanceTimersByTimeAsync(DAY);
		expect(document.querySelector('script')).toBeNull();
		expect(iframe.hasAttribute('src')).toBe(false);
		expect(iframe.getAttribute('data-src')).toBe('https://example.test/embed');
		await kernel.commands.save({ measurement: true });
		expect(document.querySelector('script')).not.toBeNull();
		expect(iframe.getAttribute('src')).toBe('https://example.test/embed');
	});

	test('fetch and XHR deny expired grants even before lifecycle refresh', async () => {
		const kernel = categoryKernel();
		const fetch = vi.fn(() => Promise.resolve(new Response('ok')));
		vi.stubGlobal('fetch', fetch);
		const blocker = createNetworkBlocker({
			kernel,
			rules: [{ category: 'measurement', domain: 'example.test' }],
		});
		disposers.push(blocker.dispose);
		vi.setSystemTime(NOW + DAY);
		expect((await globalThis.fetch('https://example.test/events')).status).toBe(
			451
		);
		expect(fetch).not.toHaveBeenCalled();
		const xhr = new XMLHttpRequest();
		const error = vi.fn();
		xhr.addEventListener('error', error);
		xhr.open('POST', 'https://example.test/events');
		xhr.send();
		expect(error).toHaveBeenCalled();
	});

	test.each([true, false, '1', 1, undefined])(
		'GPC detection is strictly boolean: %s',
		(value) => {
			Object.defineProperty(window.navigator, 'globalPrivacyControl', {
				configurable: true,
				value,
			});
			expect(hasGlobalPrivacyControlSignal()).toBe(value === true);
		}
	);
});

describe('independent IAB authority', () => {
	test('TC authority grants without category receipt, but OR cannot escape a referenced denial', async () => {
		const kernel = createConsentKernel({
			initialIab: { enabled: true },
			initialPolicyResolution: matchedResolution(iabRule()),
			now: NOW,
		});
		disposers.push(() => kernel.dispose());
		const original = installAuthority(kernel);
		const target = {
			category: { or: ['marketing', 'measurement'] as const },
			iabPurposes: [1],
			vendorId: 755,
		};
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(
			evaluateConsent(
				{ ...target, category: { or: ['marketing', 'measurement'] } },
				kernel.getSnapshot()
			)
		).toBe(true);
		expect(
			Object.isFrozen(kernel.getSnapshot().iab?.authority?.vendorConsents)
		).toBe(true);
		original.vendorConsents['755'] = false;
		expect(kernel.getSnapshot().iab?.authority?.vendorConsents['755']).toBe(
			true
		);
		await kernel.commands.save({ marketing: false, measurement: true });
		expect(
			evaluateConsent(
				{ category: { or: ['marketing', 'measurement'] } },
				kernel.getSnapshot()
			)
		).toBe(true);
		expect(
			evaluateConsent(
				{ ...target, category: { or: ['marketing', 'measurement'] } },
				kernel.getSnapshot()
			)
		).toBe(false);
	});

	test('draft maps and category saves never create TC authority', async () => {
		const kernel = createConsentKernel({
			initialIab: { enabled: true },
			initialPolicyResolution: matchedResolution(iabRule()),
			now: NOW,
		});
		disposers.push(() => kernel.dispose());
		kernel.set.iab({
			purposeConsents: { 1: true },
			vendorConsents: { '755': true },
		});
		await kernel.commands.save({ marketing: true });
		expect(
			evaluateConsent(
				{ category: 'marketing', vendorId: 755 },
				kernel.getSnapshot()
			)
		).toBe(false);
		installAuthority(kernel);
		vi.setSystemTime(NOW + DAY);
		expect(
			evaluateConsent(
				{ category: 'marketing', vendorId: 755 },
				kernel.getSnapshot()
			)
		).toBe(false);
	});
});

test('invalid addon confirmation times reject without events or writes', async () => {
	const kernel = categoryKernel();
	const snapshot = kernel.getSnapshot();
	const event = vi.fn();
	kernel.events.on('command:save:started', event);
	kernel.events.on('choice:recorded', event);
	const result = await kernel.commands.save(
		{ marketing: true },
		{ actionAt: NOW + 1 }
	);
	expect(result.ok).toBe(false);
	expect(kernel.getSnapshot()).toBe(snapshot);
	expect(event).not.toHaveBeenCalled();
});

test('historical addon confirmation evaluates expiry using the current clock', async () => {
	const kernel = categoryKernel();
	vi.setSystemTime(NOW + 2 * DAY);
	await kernel.commands.save({ marketing: true }, { actionAt: NOW });
	expect(
		kernel.getSnapshot().explicitChoice?.categories.marketing?.confirmedAt
	).toBe(NOW);
	expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
});

describe('legitimate-interest-only IAB targets', () => {
	const vendors = {
		10: { flexiblePurposes: [], legIntPurposes: [7], purposes: [] },
		755: { flexiblePurposes: [2], legIntPurposes: [], purposes: [2, 8] },
	};
	/** An IAB kernel where the visitor refused measurement. */
	const refusedMeasurement = (choice = true) => {
		const resolution = matchedResolution(iabRule());
		const kernel = createConsentKernel({
			initialIab: {
				enabled: true,
				gvl: { vendors } as unknown as GlobalVendorList,
			},
			initialPolicyResolution: resolution,
			initialRecords: choice
				? choiceRecords(
						{ marketing: true, measurement: false },
						{
							confirmedAt: NOW,
							fingerprint: resolution.fingerprints.choice,
							now: NOW,
						}
					)
				: undefined,
			now: NOW,
		});
		disposers.push(kernel.dispose);
		return kernel;
	};
	const liOnly = {
		category: 'measurement' as const,
		iabLegIntPurposes: [7],
		vendorId: 10,
	};
	const allowLI = {
		purposeLegitimateInterests: { 7: true },
		vendorLegitimateInterests: { '10': true },
	};

	test('an explicit category refusal does not block legitimate interest', () => {
		const kernel = refusedMeasurement();
		installAuthority(kernel, allowLI);
		expect(kernel.getSnapshot().restrictions.measurement).toEqual([
			'explicit-denial',
		]);
		expect(evaluateConsent(liOnly, kernel.getSnapshot(), NOW)).toBe(true);
	});

	test('a purpose a restriction moved to legitimate interest counts too', () => {
		const kernel = refusedMeasurement();
		installAuthority(kernel, {
			publisherRestrictions: [
				{ purposeId: 2, restrictionType: 2, vendorIds: [755] },
			],
			purposeLegitimateInterests: { 2: true },
			vendorLegitimateInterests: { '755': true },
		});
		const target = {
			category: 'measurement' as const,
			iabPurposes: [2],
			vendorId: 755,
		};
		expect(evaluateConsent(target, kernel.getSnapshot(), NOW)).toBe(true);
	});

	test('an objection still blocks the vendor', () => {
		const kernel = refusedMeasurement();
		installAuthority(kernel, {
			...allowLI,
			vendorLegitimateInterests: { '10': false },
		});
		expect(evaluateConsent(liOnly, kernel.getSnapshot(), NOW)).toBe(false);
	});

	test('a target with a consent purpose still honours the refusal', () => {
		const kernel = refusedMeasurement();
		installAuthority(kernel, {
			...allowLI,
			purposeConsents: { 8: true },
			vendorConsents: { '755': true },
		});
		expect(
			evaluateConsent(
				{ category: 'measurement', iabPurposes: [8], vendorId: 755 },
				kernel.getSnapshot(),
				NOW
			)
		).toBe(false);
		expect(
			evaluateConsent(
				{
					category: 'measurement',
					iabLegIntPurposes: [7],
					iabPurposes: [8],
					vendorId: 755,
				},
				kernel.getSnapshot(),
				NOW
			)
		).toBe(false);
	});

	test('legitimate interest never grants the category to other scripts', () => {
		const kernel = refusedMeasurement();
		installAuthority(kernel, allowLI);
		expect(
			evaluateConsent({ category: 'measurement' }, kernel.getSnapshot(), NOW)
		).toBe(false);
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(false);
	});

	test.each(['gpc', 'strict-scope'] as const)(
		'a %s restriction still blocks the target',
		(restriction) => {
			const kernel = refusedMeasurement();
			installAuthority(kernel, allowLI);
			const snapshot = kernel.getSnapshot();
			expect(
				evaluateConsent(
					liOnly,
					{
						...snapshot,
						restrictions: {
							...snapshot.restrictions,
							measurement: ['explicit-denial', restriction],
						},
					},
					NOW
				)
			).toBe(false);
		}
	);

	test('before any choice the target stays blocked', () => {
		const kernel = refusedMeasurement(false);
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(evaluateConsent(liOnly, kernel.getSnapshot(), NOW)).toBe(false);
	});
});

test('IAB gates apply confirmed publisher restrictions with list flexibility', () => {
	const kernel = createConsentKernel({
		initialIab: {
			enabled: true,
			gvl: {
				vendors: {
					755: { flexiblePurposes: [2], legIntPurposes: [], purposes: [2] },
				},
			} as unknown as GlobalVendorList,
		},
		initialPolicyResolution: matchedResolution(iabRule()),
		now: NOW,
	});
	disposers.push(kernel.dispose);
	const target = {
		category: 'marketing' as const,
		iabPurposes: [2],
		vendorId: 755,
	};
	installAuthority(kernel, {
		purposeConsents: { 2: true },
		purposeLegitimateInterests: { 2: true },
		vendorLegitimateInterests: { '755': true },
	});
	expect(evaluateConsent(target, kernel.getSnapshot())).toBe(true);

	installAuthority(kernel, {
		publisherRestrictions: [
			{ purposeId: 2, restrictionType: 0, vendorIds: [755] },
		],
		purposeConsents: { 2: true },
	});
	expect(evaluateConsent(target, kernel.getSnapshot())).toBe(false);

	// Required LI: the list marks purpose 2 flexible, so LI satisfies it.
	installAuthority(kernel, {
		publisherRestrictions: [
			{ purposeId: 2, restrictionType: 2, vendorIds: [755] },
		],
		purposeConsents: { 2: true },
		purposeLegitimateInterests: { 2: true },
		vendorLegitimateInterests: { '755': true },
	});
	expect(evaluateConsent(target, kernel.getSnapshot())).toBe(true);
	installAuthority(kernel, {
		publisherRestrictions: [
			{ purposeId: 2, restrictionType: 2, vendorIds: [755] },
		],
		purposeConsents: { 2: true },
	});
	expect(evaluateConsent(target, kernel.getSnapshot())).toBe(false);
});

test('strict scope and changed policy reject IAB authority', () => {
	const resolution = matchedResolution(
		iabRule({ categories: ['measurement'], scopeMode: 'strict' })
	);
	const kernel = createConsentKernel({
		initialIab: { enabled: true },
		initialPolicyResolution: resolution,
		now: NOW,
	});
	disposers.push(kernel.dispose);
	installAuthority(kernel);
	expect(
		evaluateConsent(
			{ category: 'marketing', vendorId: 755 },
			kernel.getSnapshot()
		)
	).toBe(false);
	expect(
		evaluateConsent(
			{ category: 'measurement', vendorId: 755 },
			kernel.getSnapshot()
		)
	).toBe(true);
	installAuthority(kernel, { choiceFingerprint: 'outdated' });
	expect(kernel.getSnapshot().iab?.authority).toBeNull();
	expect(
		evaluateConsent(
			{ category: 'measurement', vendorId: 755 },
			kernel.getSnapshot()
		)
	).toBe(false);
});
