/**
 * @vitest-environment jsdom
 */

import { createConsentKernel } from '@c15t/core';
import { describe, expect, test } from 'vitest';

import { createIAB } from '../index';
import type { TCFConsentData } from '../tcf/iab-tcf-types';
import { decodeTCString, generateTCString } from '../tcf/tc-string';
import { MINIMAL_TC_STRING } from './fixtures/tc-strings';
import { createMockGVL, createMockTCFConsentAllGranted } from './test-setup';

describe('@c15t/iab TC string encode/decode', () => {
	test('decodes the fixture TC string', async () => {
		const decoded = await decodeTCString(MINIMAL_TC_STRING);

		expect(decoded.cmpId).toBeGreaterThan(0);
		expect(decoded.policyVersion).toBeGreaterThan(0);
		expect(decoded.created).toBeInstanceOf(Date);
	});

	test('round-trips focused consent, legitimate interest, and disclosure data', async () => {
		const gvl = createMockGVL();
		const consentData: TCFConsentData = {
			...createMockTCFConsentAllGranted(),
			purposeConsents: { 1: true, 2: true, 7: true },
			purposeLegitimateInterests: { 10: true, 9: true },
			specialFeatureOptIns: { 1: true, 2: false },
			vendorConsents: { 1: true, 2: false, 755: true },
			vendorLegitimateInterests: { 10: true },
			vendorsDisclosed: { 1: true, 10: true, 2: true, 755: true },
		};

		const tcString = await generateTCString(consentData, gvl, {
			cmpId: 28,
			cmpVersion: 3,
			publisherCountryCode: 'GB',
		});
		const decoded = await decodeTCString(tcString);

		expect(decoded.cmpId).toBe(28);
		expect(decoded.cmpVersion).toBe(3);
		expect(decoded.purposeConsents).toMatchObject({
			1: true,
			2: true,
			7: true,
		});
		expect(decoded.purposeLegitimateInterests).toMatchObject({
			10: true,
			9: true,
		});
		expect(decoded.vendorConsents[1]).toBe(true);
		expect(decoded.vendorConsents[2]).toBeUndefined();
		expect(decoded.vendorConsents[755]).toBe(true);
		expect(decoded.vendorLegitimateInterests[10]).toBe(true);
		expect(decoded.specialFeatureOptIns[1]).toBe(true);
		expect(decoded.specialFeatureOptIns[2]).toBeUndefined();
		expect(decoded.vendorsDisclosed).toMatchObject({
			1: true,
			10: true,
			2: true,
			755: true,
		});
	});

	test('createIAB encodes vendorsDisclosed from considered vendor consent state', async () => {
		const gvl = createMockGVL();
		const kernel = createConsentKernel();
		const iab = createIAB({ cmpId: 28, gvl, kernel });

		iab.setVendorConsent(1, true);
		iab.setVendorConsent(2, false);
		iab.setVendorLegitimateInterest(10, true);

		const tcString = await iab.generateTCString();
		const decoded = await decodeTCString(tcString);

		// MVP approximation: createIAB currently discloses vendors that have
		// appeared in consent or LI state, not every vendor in the loaded GVL.
		expect(decoded.vendorsDisclosed[1]).toBe(true);
		expect(decoded.vendorsDisclosed[2]).toBe(true);
		expect(decoded.vendorsDisclosed[10]).toBe(true);
		expect(decoded.vendorsDisclosed[755]).toBeUndefined();

		iab.dispose();
	});
});
