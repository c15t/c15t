/**
 * @vitest-environment jsdom
 */

import { TCString } from '@iabtechlabtcf/core';
import { afterEach, describe, expect, test } from 'vitest';

import { createCMPApi } from '../tcf/cmp-api';
import type { TCData } from '../tcf/iab-tcf-types';
import {
	PublisherRestrictionError,
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
		const decoded = await decodeTCString(tcString);
		// The encoder may write vendors 1 and 755 as one range: no list vendor
		// sits between them. The spec allows a range to span such gaps.
		expect(decoded.publisherRestrictions.slice(0, 2)).toEqual(
			restrictions.slice(0, 2)
		);
		const [, , liRequired] = decoded.publisherRestrictions;
		expect(liRequired?.restrictionType).toBe(2);
		expect(liRequired?.vendorIds).toEqual(expect.arrayContaining([1, 755]));
		expect(
			liRequired?.vendorIds.filter((id) => Object.hasOwn(gvl.vendors, id))
		).toEqual([1, 755]);
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
});
