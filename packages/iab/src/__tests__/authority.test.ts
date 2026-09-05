/** @vitest-environment jsdom */
import { createConsentKernel, evaluateConsent } from '@c15t/core';
import type { ConsentKernel, KernelTransport } from '@c15t/core';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { createAuthorityReceipt, validateAuthority } from '../authority';
import { createIAB } from '../index';
import { generateTCString } from '../tcf/tc-string';
import { completeGVL } from './fixtures/gvl-sample';

const NOW = Date.UTC(2026, 8, 5, 12);
const DAY = 86_400_000;
const disposers: (() => void)[] = [];
beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	localStorage.clear();
});
afterEach(() => {
	for (const dispose of disposers.splice(0)) {
		dispose();
	}
	vi.useRealTimers();
	vi.restoreAllMocks();
});

const makeKernel = function makeKernel(
	transport?: KernelTransport
): ConsentKernel {
	const policy = normalizePolicyRule({
		id: 'iab-test',
		match: { isDefault: true },
		model: 'iab',
		prompt: 'choice',
		validity: { choiceDays: 1 },
	});
	const kernel = createConsentKernel({
		initialIab: { cmpId: 28, enabled: true, gvl: completeGVL },
		initialPolicyResolution: {
			fingerprints: createPolicyRuleFingerprints(policy),
			matchedBy: 'default',
			policy,
			policyId: policy.id,
			status: 'matched',
		},
		now: NOW,
		transport,
	});
	disposers.push(kernel.dispose);
	return kernel;
};

const data = {
	purposeConsents: { 1: true, 2: true, 3: true },
	purposeLegitimateInterests: {},
	specialFeatureOptIns: {},
	vendorConsents: { '755': true },
	vendorLegitimateInterests: {},
	vendorsDisclosed: { '755': true },
};

test('validates actual TC and rejects stale, future, malformed and mismatched receipts', async () => {
	const kernel = makeKernel();
	const tcString = await generateTCString(data, completeGVL, { cmpId: 28 });
	const receipt = createAuthorityReceipt(kernel.getSnapshot(), tcString, NOW);
	const authority = await validateAuthority(receipt, kernel.getSnapshot(), NOW);
	expect(authority?.vendorConsents['755']).toBe(true);
	expect(authority?.confirmedAt).toBe(NOW);
	expect(
		await validateAuthority(receipt, kernel.getSnapshot(), NOW + DAY)
	).toBeNull();
	await Promise.all(
		[
			{ tcString: 'garbage' },
			{ confirmedAt: NOW + 1 },
			{ confirmedAt: NOW - DAY },
			{ choiceFingerprint: 'old-policy' },
			{ expiresAt: NOW + 2 * DAY },
		].map(async (patch) => {
			expect(
				await validateAuthority(
					{ ...receipt, ...patch },
					kernel.getSnapshot(),
					NOW
				)
			).toBeNull();
		})
	);
});

test('IAB draft changes do not grant; save records one category action and confirmed authority', async () => {
	const kernel = makeKernel();
	const addon = createIAB({ cmpId: 28, gvl: completeGVL, kernel });
	disposers.push(addon.dispose);
	const recorded = vi.fn();
	kernel.events.on('choice:recorded', recorded);
	addon.acceptAll();
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
	expect(
		evaluateConsent(
			{ category: 'marketing', vendorId: 755 },
			kernel.getSnapshot()
		)
	).toBe(false);
	await addon.save();
	expect(recorded).toHaveBeenCalledTimes(1);
	expect(kernel.getSnapshot().iab?.authority).not.toBeNull();
	expect(
		evaluateConsent(
			{ category: 'marketing', vendorId: 755 },
			kernel.getSnapshot()
		)
	).toBe(true);
	const authority = kernel.getSnapshot().iab?.authority;
	addon.setVendorConsent(755, false);
	expect(kernel.getSnapshot().iab?.authority).toBe(authority);
	await vi.advanceTimersByTimeAsync(DAY);
	expect(kernel.getSnapshot().iab?.authority).toBeNull();
});

test('stored authority hydration preserves clocks and does not write or record choice', async () => {
	const original = makeKernel();
	const addon = createIAB({ cmpId: 28, gvl: completeGVL, kernel: original });
	addon.acceptAll();
	await addon.save();
	const confirmedAt = original.getSnapshot().iab?.authority?.confirmedAt;
	addon.dispose();
	vi.setSystemTime(NOW + 1000);
	const kernel = makeKernel();
	const recorded = vi.fn();
	kernel.events.on('choice:recorded', recorded);
	const write = vi.spyOn(Storage.prototype, 'setItem');
	const hydrated = createIAB({ cmpId: 28, gvl: completeGVL, kernel });
	disposers.push(hydrated.dispose);
	await vi.waitFor(() =>
		expect(kernel.getSnapshot().iab?.authority).not.toBeNull()
	);
	expect(kernel.getSnapshot().iab?.authority?.confirmedAt).toBe(confirmedAt);
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
	expect(recorded).not.toHaveBeenCalled();
	expect(write).not.toHaveBeenCalled();
});

test.each(['clear', 'dispose', 'draft'])(
	'late encoding cannot grant after %s',
	async (change) => {
		const kernel = makeKernel();
		const addon = createIAB({ cmpId: 28, gvl: completeGVL, kernel });
		disposers.push(addon.dispose);
		addon.acceptAll();
		const pending = addon.save();
		if (change === 'clear') {
			kernel.hydrate({ choice: null, subject: null });
		}
		if (change === 'dispose') {
			addon.dispose();
		}
		if (change === 'draft') {
			addon.rejectAll();
		}
		await pending;
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(kernel.getSnapshot().iab?.authority).toBeNull();
	}
);

test('async encoding preserves the original confirmation clock', async () => {
	const kernel = makeKernel();
	const addon = createIAB({ cmpId: 28, gvl: completeGVL, kernel });
	disposers.push(addon.dispose);
	addon.acceptAll();
	const pending = addon.save();
	vi.setSystemTime(NOW + 5000);
	await pending;
	expect(kernel.getSnapshot().iab?.authority?.confirmedAt).toBe(NOW);
	expect(
		kernel.getSnapshot().explicitChoice?.categories.marketing?.confirmedAt
	).toBe(NOW);
});

test('custom vendor ids and rejections survive validation without inherited grants', async () => {
	const kernel = makeKernel();
	const addon = createIAB({
		cmpId: 28,
		customVendors: [
			{
				id: '__proto__',
				name: 'Custom',
				privacyPolicyUrl: 'https://example.test/privacy',
				purposes: [1],
			},
			{
				id: 9001,
				name: 'Numeric custom',
				privacyPolicyUrl: 'https://example.test/privacy',
				purposes: [1],
			},
		],
		gvl: completeGVL,
		kernel,
	});
	disposers.push(addon.dispose);
	addon.acceptAll();
	addon.setVendorConsent(9001, false);
	await addon.save();
	const authority = kernel.getSnapshot().iab?.authority;
	expect(authority).not.toBeNull();
	expect(Object.hasOwn(authority?.vendorConsents ?? {}, '__proto__')).toBe(
		true
	);
	expect(
		Object.getOwnPropertyDescriptor(
			authority?.vendorConsents ?? {},
			'__proto__'
		)?.value
	).toBe(true);
	expect(authority?.vendorConsents['9001']).toBe(false);
	expect(
		evaluateConsent(
			{ category: 'marketing', vendorId: 'toString' },
			kernel.getSnapshot()
		)
	).toBe(false);
});

test('material policy change while encoding cannot restore old IAB authority', async () => {
	const kernel = makeKernel({
		init: () =>
			Promise.resolve({
				policyResolution: {
					policy: null,
					reason: 'invalid-payload',
					status: 'failed',
				},
			}),
	});
	const addon = createIAB({ cmpId: 28, gvl: completeGVL, kernel });
	disposers.push(addon.dispose);
	addon.acceptAll();
	const pending = addon.save();
	await kernel.commands.init();
	await pending;
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
	expect(kernel.getSnapshot().iab?.authority).toBeNull();
});

test('stored authority restores after delayed policy initialization', async () => {
	const original = makeKernel();
	const saved = createIAB({ cmpId: 28, gvl: completeGVL, kernel: original });
	saved.acceptAll();
	await saved.save();
	saved.dispose();
	const kernel = createConsentKernel({
		transport: {
			init: () =>
				Promise.resolve({
					policyResolution: writePolicyResolutionWire(
						original.getSnapshot().resolution
					),
				}),
		},
	});
	disposers.push(kernel.dispose);
	const addon = createIAB({ cmpId: 28, gvl: completeGVL, kernel });
	disposers.push(addon.dispose);
	await vi.advanceTimersByTimeAsync(1);
	expect(kernel.getSnapshot().iab?.authority).toBeNull();
	await kernel.commands.init();
	await vi.waitFor(() =>
		expect(kernel.getSnapshot().iab?.authority).not.toBeNull()
	);
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
});

test('clearing during stored TC hydration cannot restore authority', async () => {
	const original = makeKernel();
	const saved = createIAB({ cmpId: 28, gvl: completeGVL, kernel: original });
	saved.acceptAll();
	await saved.save();
	saved.dispose();
	const kernel = makeKernel();
	const addon = createIAB({ cmpId: 28, gvl: completeGVL, kernel });
	disposers.push(addon.dispose);
	kernel.hydrate({ choice: null, subject: null });
	await vi.advanceTimersByTimeAsync(1);
	expect(kernel.getSnapshot().iab?.authority).toBeNull();
});
