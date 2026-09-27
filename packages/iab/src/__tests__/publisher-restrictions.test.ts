/**
 * @vitest-environment jsdom
 */

import { TCString } from '@iabtechlabtcf/core';
import { afterEach, describe, expect, test } from 'vitest';

import { createCMPApi } from '../tcf/cmp-api';
import type { TCData } from '../tcf/iab-tcf-types';
import {
	PublisherRestrictionError,
	sameListedRestrictions,
	validatePublisherRestrictions,
} from '../tcf/publisher-restrictions';
import { decodeTCString, generateTCString } from '../tcf/tc-string';
import {
	CONFLICTING_RESTRICTIONS_TC_STRING,
	CONSENT_REQUIRED_TC_STRING,
	GLOBAL_SCOPE_RESTRICTION_TC_STRING,
	INVERTED_RANGE_RESTRICTION_TC_STRING,
	LEGITIMATE_INTEREST_REQUIRED_TC_STRING,
	LI_ON_CONSENT_ONLY_PURPOSE_TC_STRING,
	POLICY_2_LI_ON_PURPOSE_1_TC_STRING,
	POLICY_2_LI_ON_PURPOSE_3_TC_STRING,
	PURPOSE_PROHIBITED_TC_STRING,
	PURPOSE_ZERO_RESTRICTION_TC_STRING,
	UNDEFINED_RESTRICTION_TC_STRING,
	VENDOR_ZERO_RESTRICTION_TC_STRING,
	readWireRestrictions,
} from './fixtures/publisher-restrictions';
import {
	createMockGVL,
	createMockTCFConsent,
	createMockVendor,
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

describe('publisher restrictions: decoding spec fixtures', () => {
	test('purpose prohibited (type 0) expands single IDs and ranges', async () => {
		const decoded = await decodeTCString(PURPOSE_PROHIBITED_TC_STRING);
		// The rest of the hand-built segment decodes too.
		expect(decoded.vendorConsents).toEqual({ 1: true, 10: true, 2: true });
		expect(decoded.vendorLegitimateInterests).toEqual({ 1: true, 10: true });
		expect(decoded.purposeConsents).toEqual({ 1: true, 2: true, 7: true });
		expect(decoded.publisherRestrictions).toEqual([
			{ purposeId: 2, restrictionType: 0, vendorIds: [1, 10, 11, 12] },
		]);
	});

	test('consent required (type 1)', async () => {
		const decoded = await decodeTCString(CONSENT_REQUIRED_TC_STRING);
		expect(decoded.publisherRestrictions).toEqual([
			{ purposeId: 7, restrictionType: 1, vendorIds: [1] },
		]);
	});

	test('legitimate interest required (type 2)', async () => {
		const decoded = await decodeTCString(
			LEGITIMATE_INTEREST_REQUIRED_TC_STRING
		);
		expect(decoded.publisherRestrictions).toEqual([
			{ purposeId: 2, restrictionType: 2, vendorIds: [755] },
		]);
	});

	test('a string without restrictions decodes to an empty list', async () => {
		const tcString = await generateTCString(
			createMockTCFConsent(),
			createMockGVL(),
			{ cmpId: 28 }
		);
		expect((await decodeTCString(tcString)).publisherRestrictions).toEqual([]);
	});

	test('accepts LI required for purpose 3 in a policy version 2 string', async () => {
		const decoded = await decodeTCString(POLICY_2_LI_ON_PURPOSE_3_TC_STRING);
		expect(decoded.policyVersion).toBe(2);
		expect(decoded.publisherRestrictions).toEqual([
			{ purposeId: 3, restrictionType: 2, vendorIds: [1] },
		]);
	});

	// The codec itself refuses these while reading the string.
	test.each([
		['reserved restriction type 3', UNDEFINED_RESTRICTION_TC_STRING],
		['purpose ID 0', PURPOSE_ZERO_RESTRICTION_TC_STRING],
		['an inverted vendor range', INVERTED_RANGE_RESTRICTION_TC_STRING],
	])('rejects %s', async (_name, tcString) => {
		await expect(decodeTCString(tcString)).rejects.toThrow();
	});

	test.each([
		['vendor ID 0', VENDOR_ZERO_RESTRICTION_TC_STRING],
		[
			'legitimate interest on a consent-only purpose',
			LI_ON_CONSENT_ONLY_PURPOSE_TC_STRING,
		],
		[
			'two restriction types for one vendor',
			CONFLICTING_RESTRICTIONS_TC_STRING,
		],
		['restrictions in a global string', GLOBAL_SCOPE_RESTRICTION_TC_STRING],
		[
			'LI required for purpose 1 in a policy version 2 string',
			POLICY_2_LI_ON_PURPOSE_1_TC_STRING,
		],
	])('rejects %s with PublisherRestrictionError', async (_name, tcString) => {
		await expect(decodeTCString(tcString)).rejects.toBeInstanceOf(
			PublisherRestrictionError
		);
	});
});

/**
 * Vendor declarations the restriction rules depend on:
 * - 1: consent for 2 and 3, flexible on 2.
 * - 2: legitimate interest for 2 and 7, flexible on 2.
 * - 10: consent for 2, LI for 7, not flexible.
 * - 755: consent for 2 and 7, flexible on both.
 */
export const createRestrictionGVL = () =>
	createMockGVL({
		vendors: {
			1: createMockVendor(1, {
				flexiblePurposes: [2],
				legIntPurposes: [7],
				purposes: [1, 2, 3],
			}),
			10: createMockVendor(10, {
				flexiblePurposes: [],
				legIntPurposes: [7],
				purposes: [1, 2],
			}),
			2: createMockVendor(2, {
				flexiblePurposes: [2],
				legIntPurposes: [2, 7],
				purposes: [1, 3],
			}),
			755: createMockVendor(755, {
				flexiblePurposes: [2, 7],
				legIntPurposes: [],
				purposes: [1, 2, 7],
			}),
		},
	});

describe('publisher restrictions: encoding', () => {
	const gvl = createRestrictionGVL();

	test('writes every restriction type into the PubRestrictions section', async () => {
		const tcString = await generateTCString(
			createMockTCFConsent({
				publisherRestrictions: [
					{ purposeId: 3, restrictionType: 0, vendorIds: [1] },
					{ purposeId: 2, restrictionType: 1, vendorIds: [2] },
					{ purposeId: 7, restrictionType: 2, vendorIds: [755] },
				],
			}),
			gvl,
			{ cmpId: 28 }
		);

		// Groups are written in purpose order.
		expect(readWireRestrictions(tcString)).toEqual([
			{ entries: [2], purposeId: 2, restrictionType: 1 },
			{ entries: [1], purposeId: 3, restrictionType: 0 },
			{ entries: [755], purposeId: 7, restrictionType: 2 },
		]);
		const model = TCString.decode(tcString);
		expect(model.publisherRestrictions.getRestrictionType(1, 3)).toBe(0);
		expect(model.publisherRestrictions.getRestrictionType(2, 2)).toBe(1);
		expect(model.publisherRestrictions.getRestrictionType(755, 7)).toBe(2);
	});

	test('round-trips through decodeTCString', async () => {
		const restrictions = [
			{ purposeId: 2, restrictionType: 0 as const, vendorIds: [10] },
			{ purposeId: 2, restrictionType: 1 as const, vendorIds: [2] },
			{ purposeId: 2, restrictionType: 2 as const, vendorIds: [1, 755] },
		];
		const tcString = await generateTCString(
			createMockTCFConsent({ publisherRestrictions: restrictions }),
			gvl,
			{ cmpId: 28 }
		);
		// The encoder only writes a range across IDs missing from the vendor
		// list. Vendors 2 and 10 sit between 1 and 755 here, so each vendor
		// gets its own entry and the round trip is exact.
		expect(
			readWireRestrictions(tcString).find(
				(entry) => entry.restrictionType === 2
			)?.entries
		).toEqual([1, 755]);
		expect((await decodeTCString(tcString)).publisherRestrictions).toEqual(
			restrictions
		);
	});

	test('a range across IDs missing from the list decodes to every ID in it', async () => {
		const sparseGVL = createMockGVL({
			vendors: { 1: createMockVendor(1), 5: createMockVendor(5) },
		});
		const tcString = await generateTCString(
			createMockTCFConsent({
				publisherRestrictions: [
					{ purposeId: 2, restrictionType: 0, vendorIds: [1, 5] },
				],
				vendorConsents: { 1: true, 5: true },
				vendorsDisclosed: { 1: true, 5: true },
			}),
			sparseGVL,
			{ cmpId: 28 }
		);
		// No listed vendor sits between 1 and 5, so one range covers both.
		expect(readWireRestrictions(tcString)).toEqual([
			{ entries: [[1, 5]], purposeId: 2, restrictionType: 0 },
		]);
		const [restriction] = (await decodeTCString(tcString))
			.publisherRestrictions;
		expect(restriction?.vendorIds).toEqual([1, 2, 3, 4, 5]);
		expect(
			sameListedRestrictions(
				[restriction ?? { purposeId: 0, restrictionType: 0, vendorIds: [] }],
				[{ purposeId: 2, restrictionType: 0, vendorIds: [1, 5] }],
				sparseGVL.vendors
			)
		).toBe(true);
	});
});

describe('publisher restrictions: unsupported input fails explicitly', () => {
	const gvl = createRestrictionGVL();
	const encode = (publisherRestrictions: unknown, isServiceSpecific = true) =>
		generateTCString(
			createMockTCFConsent({
				publisherRestrictions: publisherRestrictions as never,
			}),
			gvl,
			{ cmpId: 28, isServiceSpecific }
		);

	test.each([
		['a non-array value', { purposeId: 2 }, /must be an array/u],
		[
			'reserved restriction type 3',
			[{ purposeId: 2, restrictionType: 3, vendorIds: [1] }],
			/reserved/u,
		],
		[
			'purpose ID 0',
			[{ purposeId: 0, restrictionType: 0, vendorIds: [1] }],
			/purposeId must be an integer/u,
		],
		[
			'a purpose missing from the vendor list',
			[{ purposeId: 12, restrictionType: 0, vendorIds: [1] }],
			/not a purpose in the vendor list/u,
		],
		[
			'vendor ID 0',
			[{ purposeId: 2, restrictionType: 0, vendorIds: [0] }],
			/vendor IDs must be integers/u,
		],
		[
			'a vendor ID beyond 16 bits',
			[{ purposeId: 2, restrictionType: 0, vendorIds: [65_536] }],
			/vendor IDs must be integers/u,
		],
		[
			'an empty vendor list',
			[{ purposeId: 2, restrictionType: 0, vendorIds: [] }],
			/non-empty array/u,
		],
		[
			'a vendor missing from the vendor list',
			[{ purposeId: 2, restrictionType: 0, vendorIds: [3] }],
			/vendor 3, which is not in the vendor list/u,
		],
		[
			'prohibiting a purpose the vendor does not declare',
			[{ purposeId: 3, restrictionType: 0, vendorIds: [10] }],
			/does not declare purpose 3/u,
		],
		[
			'requiring consent for a consent purpose',
			[{ purposeId: 2, restrictionType: 1, vendorIds: [1] }],
			/flexible legitimate interest purpose/u,
		],
		[
			'requiring consent for a purpose that is not flexible',
			[{ purposeId: 7, restrictionType: 1, vendorIds: [10] }],
			/flexible legitimate interest purpose/u,
		],
		[
			'requiring LI for a purpose that is not flexible',
			[{ purposeId: 2, restrictionType: 2, vendorIds: [10] }],
			/flexible consent purpose/u,
		],
		[
			'requiring LI for consent-only purpose 3',
			[{ purposeId: 3, restrictionType: 2, vendorIds: [1] }],
			/allows only with consent/u,
		],
		[
			'two restriction types for one vendor and purpose',
			[
				{ purposeId: 2, restrictionType: 0, vendorIds: [1] },
				{ purposeId: 2, restrictionType: 2, vendorIds: [1] },
			],
			/restriction types 0 and 2/u,
		],
	])('rejects %s', async (_name, input, message) => {
		const attempt = encode(input);
		await expect(attempt).rejects.toBeInstanceOf(PublisherRestrictionError);
		await expect(attempt).rejects.toThrow(message);
	});

	test('rejects LI for purposes 3 to 6 even against an older-policy list', async () => {
		await expect(
			generateTCString(
				createMockTCFConsent({
					publisherRestrictions: [
						{ purposeId: 3, restrictionType: 2, vendorIds: [1] },
					],
				}),
				{ ...gvl, tcfPolicyVersion: 2 },
				{ cmpId: 28 }
			)
		).rejects.toThrow(/allows only with consent/u);
	});

	test('rejects restrictions in a string that is not service-specific', async () => {
		await expect(
			encode([{ purposeId: 2, restrictionType: 0, vendorIds: [1] }], false)
		).rejects.toThrow(/only allowed in service-specific/u);
	});

	test('merges duplicate entries of the same type', () => {
		expect(
			validatePublisherRestrictions([
				{ purposeId: 2, restrictionType: 0, vendorIds: [755, 1] },
				{ purposeId: 2, restrictionType: 0, vendorIds: [1, 10] },
			])
		).toEqual([{ purposeId: 2, restrictionType: 0, vendorIds: [1, 10, 755] }]);
	});
});

describe('publisher restrictions: CMP API', () => {
	afterEach(() => {
		delete (window as { __tcfapi?: unknown }).__tcfapi;
	});

	test('getTCData reports restrictions keyed by purpose then vendor', async () => {
		const api = createCMPApi({ cmpId: 28, gvl: createMockGVL() });
		try {
			api.updateConsent(PURPOSE_PROHIBITED_TC_STRING);
			const tcData = await readTCData();
			expect(tcData.publisher.restrictions).toEqual({
				2: { 1: 0, 10: 0, 11: 0, 12: 0 },
			});

			api.updateConsent(LEGITIMATE_INTEREST_REQUIRED_TC_STRING);
			expect((await readTCData()).publisher.restrictions).toEqual({
				2: { 755: 2 },
			});
		} finally {
			api.destroy();
		}
	});

	test('changing the published consent data in place cannot mix vectors', async () => {
		const api = createCMPApi({ cmpId: 28, gvl: createMockGVL() });
		try {
			const consentData = createMockTCFConsent({
				purposeConsents: { 1: true, 2: true },
				vendorConsents: { 1: true, 2: true },
			});
			api.updateConsent(LEGITIMATE_INTEREST_REQUIRED_TC_STRING, consentData);
			const pending = readTCData();
			// The caller reuses its object while the string decodes.
			consentData.purposeConsents[2] = false;
			consentData.vendorConsents[2] = false;
			const tcData = await pending;
			expect(tcData.purpose.consents).toEqual({ 1: true, 2: true });
			expect(tcData.vendor.consents).toEqual({ 1: true, 2: true });
			// Nor can it rewrite data already published.
			expect((await readTCData()).purpose.consents).toEqual({
				1: true,
				2: true,
			});
		} finally {
			api.destroy();
		}
	});

	test('an update during decoding never pairs a string with older data', async () => {
		const api = createCMPApi({ cmpId: 28, gvl: createMockGVL() });
		try {
			api.updateConsent(PURPOSE_PROHIBITED_TC_STRING);
			// Starts decoding the first string, then replaces it before the
			// decode settles.
			const pending = readTCData();
			api.updateConsent(LEGITIMATE_INTEREST_REQUIRED_TC_STRING);
			const tcData = await pending;
			expect(tcData.tcString).toBe(LEGITIMATE_INTEREST_REQUIRED_TC_STRING);
			expect(tcData.publisher.restrictions).toEqual({ 2: { 755: 2 } });
			expect(tcData.vendor.consents).toEqual({ 755: true });
		} finally {
			api.destroy();
		}
	});
});
