/**
 * The shared vendor reader behind React's `useVendorAllowed`, Vue's
 * composable, the Svelte getter and the Astro and browser clients. A
 * declared vendor follows its denial and its category; an id nothing
 * declares reads as not allowed, so a typo never looks like consent.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	choiceRecords,
	iabRule,
	matchedResolution,
	NOW,
} from '../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel, isVendorAllowed } from '../../index';
import type { ConsentSnapshot, ResolvedVendor } from '../../types';

const vendor = (
	id: string,
	extra: Partial<ResolvedVendor> = {}
): ResolvedVendor => ({
	category: 'marketing',
	id,
	presentable: false,
	source: 'config',
	...extra,
});

const snapshotWith = function snapshotWith({
	consents = { marketing: true },
	declared = [vendor('meta-pixel')],
	denied = [],
}: {
	consents?: Partial<Record<'marketing' | 'measurement', boolean>>;
	declared?: ResolvedVendor[];
	denied?: string[];
} = {}): ConsentSnapshot {
	return createConsentKernel({
		initialRecords: {
			...choiceRecords({ measurement: false, ...consents }),
			vendorChoice: { confirmedAt: NOW - 1, denied, version: 1 },
		},
		initialVendors: { declared, listVersion: null },
		now: NOW,
	}).getSnapshot();
};

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
});

describe('isVendorAllowed', () => {
	test('allows a declared vendor whose category is granted', () => {
		expect(isVendorAllowed(snapshotWith(), 'meta-pixel', NOW)).toBe(true);
	});

	test('denies a declared vendor whose category is denied', () => {
		const snap = snapshotWith({ consents: { marketing: false } });
		expect(isVendorAllowed(snap, 'meta-pixel', NOW)).toBe(false);
	});

	test('denies a declared vendor the visitor turned off', () => {
		const snap = snapshotWith({ denied: ['meta-pixel'] });
		expect(isVendorAllowed(snap, 'meta-pixel', NOW)).toBe(false);
	});

	test('ignores a stored denial for a vendor now declared disabled', () => {
		const snap = snapshotWith({
			declared: [vendor('meta-pixel', { disabled: true })],
			denied: ['meta-pixel'],
		});
		expect(isVendorAllowed(snap, 'meta-pixel', NOW)).toBe(true);
	});

	test('reads an undeclared vendor as not allowed, even when its category would pass', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const snap = snapshotWith({ declared: [], denied: ['meta-pixel'] });
		expect(snap.effectivePermissions.marketing).toBe(true);
		expect(isVendorAllowed(snap, 'meta-pixel', NOW)).toBe(false);
		expect(isVendorAllowed(snapshotWith(), 'meta-pixle', NOW)).toBe(false);
	});

	test('warns once per undeclared id in development, naming the missing declaration', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const snap = snapshotWith();
		isVendorAllowed(snap, 'warn-once-vendor', NOW);
		isVendorAllowed(snap, 'warn-once-vendor', NOW);
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).toMatch(
			/"warn-once-vendor" is not declared.*vendors option/u
		);
		isVendorAllowed(snap, 'another-undeclared-vendor', NOW);
		expect(warn).toHaveBeenCalledTimes(2);
		isVendorAllowed(snap, 'meta-pixel', NOW);
		expect(warn).toHaveBeenCalledTimes(2);
	});

	test('does not warn in production', () => {
		vi.stubEnv('NODE_ENV', 'production');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		expect(isVendorAllowed(snapshotWith(), 'production-vendor', NOW)).toBe(
			false
		);
		expect(warn).not.toHaveBeenCalled();
	});

	test('does not warn while the policy, and with it the backend vendor list, is pending', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const snap = createConsentKernel({
			initialPolicyPending: true,
			now: NOW,
		}).getSnapshot();
		expect(snap.policyPending).toBe(true);
		expect(isVendorAllowed(snap, 'backend-vendor', NOW)).toBe(false);
		expect(warn).not.toHaveBeenCalled();
	});

	test('ignores the denial list under an IAB policy and follows the category', () => {
		const snap = createConsentKernel({
			initialIab: { enabled: true },
			initialPolicyResolution: matchedResolution(iabRule()),
			initialRecords: {
				...choiceRecords({ marketing: true }),
				vendorChoice: {
					confirmedAt: NOW - 1,
					denied: ['meta-pixel'],
					version: 1,
				},
			},
			initialVendors: { declared: [vendor('meta-pixel')], listVersion: null },
			now: NOW,
		}).getSnapshot();
		expect(snap.model).toBe('iab');
		expect(isVendorAllowed(snap, 'meta-pixel', NOW)).toBe(
			snap.effectivePermissions.marketing
		);
	});
});
