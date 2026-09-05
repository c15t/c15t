/**
 * @vitest-environment jsdom
 */

import { createConsentKernel } from '@c15t/core';
import { describe, expect, test, vi } from 'vitest';

import { createIAB } from '../index';
import type { TCFConsentData } from '../tcf/iab-tcf-types';
import { decodeTCString, generateTCString } from '../tcf/tc-string';
import { MINIMAL_TC_STRING } from './fixtures/tc-strings';
import { createMockGVL, createMockTCFConsentAllGranted } from './test-setup';

describe('@c15t/iab TC string encode/decode', () => {
	test.each([undefined, false])(
		'controls TC storage with persistence=%s',
		async (persistence) => {
			const save = vi.fn().mockResolvedValue({ ok: true });
			const kernel = createConsentKernel({ transport: { save } });
			const iab = createIAB({
				cmpId: 28,
				gvl: createMockGVL(),
				kernel,
				persistence,
			});
			localStorage.setItem('euconsent-v2', 'existing');
			document.cookie = 'euconsent-v2=existing; path=/';
			try {
				iab.acceptAll();
				await iab.save();
				const tcString = kernel.getSnapshot().iab?.tcString;
				expect(tcString).toBeTruthy();
				expect(save).toHaveBeenCalledWith(
					expect.objectContaining({ tcString })
				);
				const stored = persistence === false ? 'existing' : tcString;
				expect(localStorage.getItem('euconsent-v2')).toBe(stored);
				expect(document.cookie).toContain(`euconsent-v2=${stored}`);
			} finally {
				iab.dispose();
				localStorage.removeItem('euconsent-v2');
				document.cookie = 'euconsent-v2=; Max-Age=0; path=/';
			}
		}
	);
	test.each(['acceptAll', 'rejectAll'] as const)(
		'saves %s with custom vendors without adding them to TCF vectors',
		async (action) => {
			const save = vi.fn().mockResolvedValue({ ok: true });
			const kernel = createConsentKernel({ transport: { save } });
			const iab = createIAB({
				cmpId: 28,
				customVendors: ['internal-analytics', '999', 2].map((id) => ({
					id,
					legIntPurposes: [2],
					name: String(id),
					privacyPolicyUrl: 'https://example.test/privacy',
					purposes: [1],
				})),
				gvl: createMockGVL(),
				kernel,
			});
			try {
				iab[action]();
				await iab.save();
				expect(save).toHaveBeenCalledOnce();
				const tcString = kernel.getSnapshot().iab?.tcString ?? '';
				expect(save).toHaveBeenCalledWith(
					expect.objectContaining({ tcString })
				);
				const decoded = await decodeTCString(tcString);
				for (const vector of [
					decoded.vendorConsents,
					decoded.vendorLegitimateInterests,
					decoded.vendorsDisclosed,
				]) {
					expect(vector[999]).toBeUndefined();
					expect(vector[2]).toBeUndefined();
				}
				expect(decoded.vendorsDisclosed[1]).toBe(true);
				expect(decoded.vendorConsents[1]).toBe(
					action === 'acceptAll' ? true : undefined
				);
				for (const id of ['internal-analytics', '999', '2']) {
					expect(kernel.getSnapshot().iab?.vendorConsents[id]).toBe(
						action === 'acceptAll'
					);
					expect(kernel.getSnapshot().iab?.vendorLegitimateInterests[id]).toBe(
						action === 'acceptAll'
					);
				}
			} finally {
				iab.dispose();
			}
		}
	);
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
