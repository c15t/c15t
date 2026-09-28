/**
 * @vitest-environment jsdom
 */

import { createConsentKernel } from '@c15t/core';
import { resolvePolicyRules } from '@c15t/schema/types';
import { describe, expect, test, vi } from 'vitest';

import { createIAB } from '../index';
import { createCMPApi } from '../tcf/cmp-api';
import type { TCData, TCFConsentData } from '../tcf/iab-tcf-types';
import { decodeTCString, generateTCString } from '../tcf/tc-string';
import { MINIMAL_TC_STRING } from './fixtures/tc-strings';
import {
	createMockGVL,
	createMockTCFConsent,
	createMockTCFConsentAllGranted,
	createMockVendor,
	createMockVendors,
} from './test-setup';

const readTCData = (): Promise<TCData> =>
	new Promise((resolve, reject) => {
		window.__tcfapi?.('getTCData', 2, (data, success) => {
			if (success && data) {
				resolve(data);
			} else {
				reject(new Error('getTCData failed'));
			}
		});
	});

describe('@c15t/iab TC string encode/decode', () => {
	test.each([undefined, false])(
		'controls TC storage with persistence=%s',
		async (persistence) => {
			const save = vi.fn().mockResolvedValue({ ok: true });
			const kernel = createConsentKernel({
				initialPolicyResolution: resolvePolicyRules({
					rules: [
						{
							id: 'iab-save',
							match: { isDefault: true },
							model: 'iab',
							prompt: 'choice',
						},
					],
				}),
				transport: { save },
			});
			const iab = createIAB({
				cmpId: 28,
				gvl: createMockGVL(),
				kernel,
				persistence,
			});
			localStorage.setItem('euconsent-v2', 'existing');
			localStorage.setItem('c15t-iab-authority-v1', 'existing');
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
				const authority = localStorage.getItem('c15t-iab-authority-v1');
				const authorityString =
					persistence === false
						? authority
						: JSON.parse(authority ?? 'null').tcString;
				expect(authorityString).toBe(stored);
				expect(document.cookie).toContain(`euconsent-v2=${stored}`);
			} finally {
				iab.dispose();
				localStorage.removeItem('euconsent-v2');
				localStorage.removeItem('c15t-iab-authority-v1');
				kernel.dispose();
				document.cookie = 'euconsent-v2=; Max-Age=0; path=/';
			}
		}
	);
	test.each(['acceptAll', 'rejectAll'] as const)(
		'saves %s with custom vendors without adding them to TCF vectors',
		async (action) => {
			const save = vi.fn().mockResolvedValue({ ok: true });
			const kernel = createConsentKernel({
				initialPolicyResolution: resolvePolicyRules({
					rules: [
						{
							id: 'iab-save',
							match: { isDefault: true },
							model: 'iab',
							prompt: 'choice',
						},
					],
				}),
				transport: { save },
			});
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

describe('@c15t/iab TCF 2.4 encoding rules', () => {
	test('clears the vendor LI bit for a vendor that declares only special purposes', async () => {
		// TCF 2.4 removed the rule that set this bit. The vendor has no
		// purpose on legitimate interest, so the bit must be 0.
		const gvl = createMockGVL({
			vendors: {
				...createMockVendors(),
				42: createMockVendor(42, {
					flexiblePurposes: [],
					legIntPurposes: [],
					purposes: [],
					specialPurposes: [1, 2],
				}),
			},
		});
		const tcString = await generateTCString(
			createMockTCFConsent({
				vendorLegitimateInterests: { 10: true, 42: true },
				vendorsDisclosed: { 10: true, 42: true },
			}),
			gvl,
			{ cmpId: 28 }
		);
		const decoded = await decodeTCString(tcString);

		expect(decoded.vendorLegitimateInterests[42]).toBeUndefined();
		// A vendor with a real LI purpose keeps its bit.
		expect(decoded.vendorLegitimateInterests[10]).toBe(true);
		expect(decoded.vendorsDisclosed[42]).toBe(true);
	});

	test('always encodes IsServiceSpecific=1', async () => {
		const tcString = await generateTCString(
			createMockTCFConsent(),
			createMockGVL(),
			{ cmpId: 28, isServiceSpecific: false }
		);

		expect((await decodeTCString(tcString)).isServiceSpecific).toBe(true);
	});
});

describe('@c15t/iab CMP API disclosed vendors', () => {
	test('getTCData lists the vendors encoded in the disclosed vendors segment', async () => {
		const gvl = createMockGVL();
		const consentData = createMockTCFConsent({
			// Vendor 0 and false entries are not encoded, so TC data must not
			// list them either.
			vendorsDisclosed: { 0: true, 1: true, 10: false, 755: true },
		});
		const tcString = await generateTCString(consentData, gvl, { cmpId: 28 });
		const api = createCMPApi({ cmpId: 28, gvl });
		try {
			api.updateConsent(tcString, consentData);
			const tcData = await readTCData();

			expect(tcData.vendor.disclosedVendors).toEqual({ 1: true, 755: true });
			expect(tcData.vendor.disclosedVendors).toEqual(
				(await decodeTCString(tcString)).vendorsDisclosed
			);
		} finally {
			api.destroy();
		}
	});

	test('getTCData reads disclosed vendors from a stored string without consent data', async () => {
		const gvl = createMockGVL();
		const tcString = await generateTCString(
			createMockTCFConsent({ vendorsDisclosed: { 10: true, 2: true } }),
			gvl,
			{ cmpId: 28 }
		);
		const api = createCMPApi({ cmpId: 28, gvl });
		try {
			api.updateConsent(tcString);

			expect((await readTCData()).vendor.disclosedVendors).toEqual({
				10: true,
				2: true,
			});
		} finally {
			api.destroy();
		}
	});
});
