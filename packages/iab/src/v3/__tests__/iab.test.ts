/**
 * Tests for @c15t/iab/v3 — the v3 IAB TCF module.
 *
 * Verifies:
 * - createIAB seeds the kernel's iab slice (cmpId, customVendors).
 * - setVendorConsent / setPurposeConsent route through kernel.set.iab.
 * - setPurposeConsent also propagates to c15t categories.
 * - acceptAll / rejectAll flip every vendor + purpose.
 * - dispose cleans up the CMP API + kernel subscription.
 */

import type { GlobalVendorList } from 'c15t/v3';
import { createConsentKernel } from 'c15t/v3';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { setMockGVL } from '../../tcf/fetch-gvl';
import { createIAB } from '../index';

const MOCK_GVL: GlobalVendorList = {
	gvlSpecificationVersion: 3,
	vendorListVersion: 42,
	tcfPolicyVersion: 4,
	lastUpdated: '2026-01-01T00:00:00Z',
	purposes: {
		1: { id: 1, name: 'Store and/or access information', description: '' },
		2: { id: 2, name: 'Select basic ads', description: '' },
		3: { id: 3, name: 'Create a personalised ads profile', description: '' },
		4: { id: 4, name: 'Select personalised ads', description: '' },
	},
	specialPurposes: {},
	features: {},
	specialFeatures: {
		1: { id: 1, name: 'Use precise geolocation data', description: '' },
	},
	stacks: {},
	vendors: {
		'1': {
			id: 1,
			name: 'Vendor 1',
			purposes: [1, 2],
			legIntPurposes: [],
			flexiblePurposes: [],
			specialPurposes: [],
			features: [],
			specialFeatures: [],
			policyUrl: '',
		},
		'755': {
			id: 755,
			name: 'Google',
			purposes: [1, 2, 3],
			legIntPurposes: [],
			flexiblePurposes: [],
			specialPurposes: [],
			features: [],
			specialFeatures: [],
			policyUrl: '',
		},
	},
} as unknown as GlobalVendorList;

beforeEach(() => {
	setMockGVL(MOCK_GVL);
});

describe('createIAB: seeding the kernel', () => {
	test('seeds iab.cmpId + customVendors immediately', () => {
		const kernel = createConsentKernel();
		const customVendors = [
			{ id: 'cv-1', name: 'Custom One' },
		] as unknown as Parameters<typeof createIAB>[0]['customVendors'];

		const iab = createIAB({
			kernel,
			cmpId: 28,
			customVendors,
			gvl: MOCK_GVL,
		});

		const snap = kernel.getSnapshot();
		expect(snap.iab).not.toBeNull();
		expect(snap.iab?.cmpId).toBe(28);
		expect(snap.iab?.customVendors).toHaveLength(1);
		expect(snap.iab?.enabled).toBe(true);

		iab.dispose();
	});

	test('null gvl disables IAB (non-IAB region)', () => {
		const kernel = createConsentKernel();
		const iab = createIAB({
			kernel,
			cmpId: 28,
			gvl: null,
		});
		expect(kernel.getSnapshot().iab?.enabled).toBe(false);
		iab.dispose();
	});
});

describe('createIAB: mutations', () => {
	test('setVendorConsent updates the snapshot', () => {
		const kernel = createConsentKernel();
		const iab = createIAB({ kernel, cmpId: 28, gvl: MOCK_GVL });

		iab.setVendorConsent(755, true);
		expect(kernel.getSnapshot().iab?.vendorConsents['755']).toBe(true);

		iab.setVendorConsent('755', false);
		expect(kernel.getSnapshot().iab?.vendorConsents['755']).toBe(false);

		iab.dispose();
	});

	test('setPurposeConsent propagates to c15t categories when all related purposes are granted', () => {
		const kernel = createConsentKernel();
		const iab = createIAB({ kernel, cmpId: 28, gvl: MOCK_GVL });

		// `marketing` requires purposes 2+3+4 all true. Flip them in
		// sequence and verify marketing flips on the last.
		iab.setPurposeConsent(2, true);
		expect(kernel.getSnapshot().consents.marketing).toBe(false);
		iab.setPurposeConsent(3, true);
		expect(kernel.getSnapshot().consents.marketing).toBe(false);
		iab.setPurposeConsent(4, true);
		expect(kernel.getSnapshot().consents.marketing).toBe(true);

		iab.dispose();
	});

	test('acceptAll flips every vendor + purpose + special feature', () => {
		const kernel = createConsentKernel();
		const iab = createIAB({ kernel, cmpId: 28, gvl: MOCK_GVL });

		iab.acceptAll();
		const snap = kernel.getSnapshot();
		expect(snap.iab?.vendorConsents['1']).toBe(true);
		expect(snap.iab?.vendorConsents['755']).toBe(true);
		expect(snap.iab?.purposeConsents[1]).toBe(true);
		expect(snap.iab?.purposeConsents[2]).toBe(true);
		expect(snap.iab?.purposeConsents[3]).toBe(true);
		expect(snap.iab?.specialFeatureOptIns[1]).toBe(true);
		// c15t categories should follow.
		expect(snap.consents.marketing).toBe(true);

		iab.dispose();
	});

	test('rejectAll clears everything', () => {
		const kernel = createConsentKernel();
		const iab = createIAB({ kernel, cmpId: 28, gvl: MOCK_GVL });
		iab.acceptAll();
		iab.rejectAll();
		const snap = kernel.getSnapshot();
		expect(snap.iab?.vendorConsents['755']).toBe(false);
		expect(snap.iab?.purposeConsents[2]).toBe(false);
		expect(snap.consents.marketing).toBe(false);
		iab.dispose();
	});
});

describe('createIAB: dispose', () => {
	test('unsubscribes from kernel and tears down CMP API', () => {
		const kernel = createConsentKernel();
		const iab = createIAB({ kernel, cmpId: 28, gvl: MOCK_GVL });

		const listener = vi.fn();
		kernel.subscribe(listener);

		iab.dispose();

		// Mutation after dispose should still notify external subscribers
		// (we unsubscribed the module's internal one, not the caller's).
		kernel.set.consent({ marketing: true });
		expect(listener).toHaveBeenCalled();
	});
});
