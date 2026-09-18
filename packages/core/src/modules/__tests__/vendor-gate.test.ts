/**
 * Vendor-level consent at the shared gate. A denied vendor blocks a target
 * whose category passes; unknown, undeclared and disabled vendors are
 * granted; IAB mode ignores the vendor slug; category evaluation still runs
 * first so config errors throw.
 */
import { describe, expect, test } from 'vitest';

import {
	choiceRecords,
	iabRule,
	matchedResolution,
	NOW,
} from '../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../index';
import type { ConsentSnapshot } from '../../types';
import { evaluateConsent, isVendorDenied } from '../has';

/** The slugs these tests deny, declared so the gate honors the denial. */
const declaredVendors = (ids: readonly string[]) => ({
	declared: ids.map((id) => ({
		category: 'marketing' as const,
		id,
		presentable: false,
		source: 'script' as const,
	})),
	listVersion: null,
});

const snapshotWith = function snapshotWith(
	denied: string[],
	consents: Partial<Record<'marketing' | 'measurement', boolean>> = {
		marketing: true,
	}
): ConsentSnapshot {
	return createConsentKernel({
		initialRecords: {
			...choiceRecords({ measurement: false, ...consents }),
			vendorChoice: { confirmedAt: NOW - 1, denied, version: 1 },
		},
		initialVendors: declaredVendors(denied),
		now: NOW,
	}).getSnapshot();
};

describe('isVendorDenied', () => {
	test('reads the denial list and grants unknown ids', () => {
		const snap = snapshotWith(['meta-pixel']);
		expect(isVendorDenied(snap, 'meta-pixel')).toBe(true);
		expect(isVendorDenied(snap, 'google-analytics')).toBe(false);
		expect(
			isVendorDenied({ vendorChoice: null, vendors: null }, 'meta-pixel')
		).toBe(false);
	});
});

describe('evaluateConsent with a vendor slug', () => {
	test('denies a target whose vendor is turned off inside a granted category', () => {
		const snap = snapshotWith(['meta-pixel']);
		expect(
			evaluateConsent({ category: 'marketing', vendor: 'meta-pixel' }, snap)
		).toBe(false);
		expect(
			evaluateConsent({ category: 'marketing', vendor: 'other' }, snap)
		).toBe(true);
		expect(evaluateConsent({ category: 'marketing' }, snap)).toBe(true);
	});

	test('a granted vendor never overrides a denied category', () => {
		const snap = snapshotWith([], { marketing: false });
		expect(
			evaluateConsent({ category: 'marketing', vendor: 'meta-pixel' }, snap)
		).toBe(false);
	});

	test('a denied vendor also denies a negated condition that passes', () => {
		const snap = snapshotWith(['meta-pixel'], { marketing: false });
		expect(evaluateConsent({ category: { not: 'marketing' } }, snap)).toBe(
			true
		);
		expect(
			evaluateConsent(
				{ category: { not: 'marketing' }, vendor: 'meta-pixel' },
				snap
			)
		).toBe(false);
	});

	test('a stored denial for a vendor no longer declared is ignored', () => {
		// The visitor has no switch left to grant it again, so it follows its
		// category like a vendor never declared.
		const snap = createConsentKernel({
			initialRecords: {
				...choiceRecords({ marketing: true }),
				vendorChoice: {
					confirmedAt: NOW - 1,
					denied: ['meta-pixel'],
					version: 1,
				},
			},
			now: NOW,
		}).getSnapshot();
		expect(isVendorDenied(snap, 'meta-pixel')).toBe(false);
		expect(
			evaluateConsent({ category: 'marketing', vendor: 'meta-pixel' }, snap)
		).toBe(true);
	});

	test('a stored denial for a vendor now declared disabled is ignored', () => {
		const snap = createConsentKernel({
			initialRecords: {
				...choiceRecords({ marketing: true }),
				vendorChoice: {
					confirmedAt: NOW - 1,
					denied: ['cdn', 'meta-pixel'],
					version: 1,
				},
			},
			initialVendors: {
				declared: [
					{
						category: 'marketing',
						disabled: true,
						id: 'cdn',
						presentable: false,
						source: 'config',
					},
					...declaredVendors(['meta-pixel']).declared,
				],
				listVersion: null,
			},
			now: NOW,
		}).getSnapshot();
		expect(isVendorDenied(snap, 'cdn')).toBe(false);
		expect(isVendorDenied(snap, 'meta-pixel')).toBe(true);
		expect(
			evaluateConsent({ category: 'marketing', vendor: 'cdn' }, snap)
		).toBe(true);
	});

	test('an unknown category still throws before the vendor is consulted', () => {
		const snap = snapshotWith(['meta-pixel']);
		expect(() =>
			evaluateConsent(
				{ category: 'analytics' as never, vendor: 'meta-pixel' },
				snap
			)
		).toThrow(/not found in consent state/u);
	});

	test('the vendor slug is inert under an IAB policy', () => {
		const base = createConsentKernel({
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
			now: NOW,
		}).getSnapshot();
		expect(base.model).toBe('iab');
		// No IAB fields: the category path decides and the vendor is ignored.
		expect(
			evaluateConsent({ category: 'marketing', vendor: 'meta-pixel' }, base)
		).toBe(base.effectivePermissions.marketing);
	});
});
