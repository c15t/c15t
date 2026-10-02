/**
 * Regression tests for vendors that declare only Special Purposes.
 *
 * TCF 2.4 removed the rule that set the vendor legitimate interest bit for
 * these vendors. The bit must now be 0, including when an older TC string
 * that carries it is restored and saved again.
 *
 * @vitest-environment jsdom
 */

import { GVL, Segment, SegmentEncoder, TCModel } from '@iabtechlabtcf/core';
import type {
	ConsentManagerInterface,
	ConsentStoreState,
	IABConfig,
} from 'c15t';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeIABMode } from '../../init/iab-initializer';
import { IAB_STORAGE_KEYS } from '../../tcf/constants';
import type { GlobalVendorList } from '../../tcf/iab-tcf-types';
import { createIABActions, createInitialIABState } from '../../tcf/store';
import { destroyIABStub } from '../../tcf/stub';
import { decodeTCString, generateTCString } from '../../tcf/tc-string';
import {
	cleanupTCFApi,
	createMockGVL,
	createMockTCFConsentAllGranted,
	createMockVendor,
	createMockVendors,
	setupStorageMock,
} from './test-setup';

/** Vendor that declares only Special Purposes. */
const SP_ONLY_VENDOR_ID = 900;
/** Vendor with regular legitimate interest purposes. */
const LI_VENDOR_ID = 1;

function createGVLWithSpecialPurposeOnlyVendor(): GlobalVendorList {
	return createMockGVL({
		vendors: {
			...createMockVendors([LI_VENDOR_ID]),
			[SP_ONLY_VENDOR_ID]: createMockVendor(SP_ONLY_VENDOR_ID, {
				purposes: [],
				legIntPurposes: [],
				flexiblePurposes: [],
				specialPurposes: [1, 2],
				features: [],
				specialFeatures: [],
			}),
		},
	});
}

/**
 * Encodes a TC string the way older encoders did: the vendor LI bit is set
 * for the Special-Purpose-only vendor. Skips the semantic pre-encoder, which
 * now clears that bit.
 */
function encodeLegacyTCString(gvlData: GlobalVendorList): string {
	// biome-ignore lint/suspicious/noExplicitAny: GVL library types don't match our domain types
	const tcModel = new TCModel(new GVL(gvlData as any));
	tcModel.cmpId = 28;
	tcModel.cmpVersion = 1;
	tcModel.isServiceSpecific = true;
	tcModel.purposeConsents.set([1, 2, 7]);
	tcModel.purposeLegitimateInterests.set([9, 10]);
	tcModel.vendorConsents.set(LI_VENDOR_ID);
	tcModel.vendorLegitimateInterests.set([LI_VENDOR_ID, SP_ONLY_VENDOR_ID]);

	return SegmentEncoder.encode(tcModel, Segment.CORE);
}

describe('Special-Purpose-only vendor legitimate interest bit', () => {
	let gvl: GlobalVendorList;

	beforeEach(() => {
		gvl = createGVLWithSpecialPurposeOnlyVendor();
	});

	it('encodes the vendor LI bit as 0 even when the input sets it', async () => {
		const consentData = {
			...createMockTCFConsentAllGranted(),
			vendorConsents: { [LI_VENDOR_ID]: true },
			vendorLegitimateInterests: {
				[LI_VENDOR_ID]: true,
				[SP_ONLY_VENDOR_ID]: true,
			},
			vendorsDisclosed: { [LI_VENDOR_ID]: true, [SP_ONLY_VENDOR_ID]: true },
		};

		const tcString = await generateTCString(consentData, gvl, {
			cmpId: 28,
			cmpVersion: 1,
		});
		const decoded = await decodeTCString(tcString);

		expect(decoded.vendorLegitimateInterests[SP_ONLY_VENDOR_ID]).not.toBe(true);
		expect(decoded.vendorLegitimateInterests[LI_VENDOR_ID]).toBe(true);
		expect(decoded.vendorsDisclosed[SP_ONLY_VENDOR_ID]).toBe(true);
	});

	describe('restoring an older TC string', () => {
		let storageMock: ReturnType<typeof setupStorageMock>;

		beforeEach(() => {
			storageMock = setupStorageMock();
			document.cookie = `${IAB_STORAGE_KEYS.TC_STRING_COOKIE}=; max-age=0; path=/`;
		});

		afterEach(() => {
			destroyIABStub();
			cleanupTCFApi();
			storageMock.cleanup();
			document.cookie = `${IAB_STORAGE_KEYS.TC_STRING_COOKIE}=; max-age=0; path=/`;
		});

		it('clears the bit when the restored consent is saved again', async () => {
			const legacyTCString = encodeLegacyTCString(gvl);
			const legacy = await decodeTCString(legacyTCString);
			expect(legacy.vendorLegitimateInterests[SP_ONLY_VENDOR_ID]).toBe(true);

			storageMock.storage.set(IAB_STORAGE_KEYS.TC_STRING_LOCAL, legacyTCString);

			const config: IABConfig = { enabled: true, cmpId: 28, cmpVersion: 1 };
			let state = {
				iab: createInitialIABState(config),
				consents: {},
				selectedConsents: {},
				activeUI: 'banner',
				updateScripts: vi.fn(),
				callbacks: {},
			} as unknown as ConsentStoreState;
			const get = () => state;
			const set = (partial: Partial<ConsentStoreState>) => {
				state = { ...state, ...partial };
			};

			await initializeIABMode(config, { get, set }, gvl);

			expect(state.iab?.tcString).toBe(legacyTCString);
			expect(
				state.iab?.vendorLegitimateInterests[String(SP_ONLY_VENDOR_ID)]
			).toBe(true);

			const manager = {
				setConsent: vi.fn().mockResolvedValue({ ok: true, data: {} }),
			} as unknown as ConsentManagerInterface;
			await createIABActions(get, set, manager).save();

			const savedTCString = state.iab?.tcString;
			expect(savedTCString).toBeTruthy();
			expect(savedTCString).not.toBe(legacyTCString);

			const saved = await decodeTCString(savedTCString as string);
			expect(saved.vendorLegitimateInterests[SP_ONLY_VENDOR_ID]).not.toBe(true);
			expect(saved.vendorLegitimateInterests[LI_VENDOR_ID]).toBe(true);
			expect(saved.isServiceSpecific).toBe(true);
		});
	});
});
