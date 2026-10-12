/**
 * GPP code that runs without a DOM: the TCF EU parsed section and server
 * rendering.
 */

import { createConsentKernel } from '@c15t/core';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
} from '@c15t/schema/types';
import { GppModel } from '@iabgpp/cmpapi';
import { GVL, Segment, TCModel, TCString } from '@iabtechlabtcf/core';
import { describe, expect, test } from 'vitest';

import { createGPP } from '../gpp';
import { encodeGPPString } from '../gpp/encoder';
import { parseTCFEUSection } from '../gpp/tcf-section';
import { completeGVL } from './fixtures/gvl-sample';
import { PURPOSE_PROHIBITED_TC_STRING } from './fixtures/publisher-restrictions';

/** IDs set in a reference-implementation boolean bitfield. */
const setIds = (bits: boolean[]): number[] =>
	bits.flatMap((set, index) => (set ? [index + 1] : []));

describe('parseTCFEUSection', () => {
	test('uses the section specification names and ID arrays', async () => {
		const [core, ...rest] = await parseTCFEUSection(
			PURPOSE_PROHIBITED_TC_STRING
		);
		expect(rest).toEqual([]);
		expect(core).toMatchObject({
			PubRestrictions: [{ Ids: [1, 10, 11, 12], Key: 2, Type: 0 }],
			PurposeConsent: [1, 2, 7],
			PurposesLITransparency: [7, 9],
			SpecialFeatureOptIns: [],
			TcfPolicyVersion: 5,
			VendorConsent: [1, 2, 10],
			VendorLegitimateInterest: [1, 10],
			Version: 2,
		});
		expect(core?.Created).toBeInstanceOf(Date);

		// The IAB reference decoder reads the same values from the string.
		const reference = new GppModel(
			encodeGPPString([{ encoded: PURPOSE_PROHIBITED_TC_STRING, id: 2 }])
		);
		expect(core?.PurposeConsent).toEqual(
			setIds(reference.getFieldValue('tcfeuv2', 'PurposeConsents'))
		);
		expect(core?.PurposesLITransparency).toEqual(
			setIds(reference.getFieldValue('tcfeuv2', 'PurposeLegitimateInterests'))
		);
		expect(core?.VendorConsent).toEqual(
			reference.getFieldValue('tcfeuv2', 'VendorConsents')
		);
		expect(core?.CmpId).toBe(reference.getFieldValue('tcfeuv2', 'CmpId'));
	});

	test('adds the disclosed vendors and publisher purposes segments in string order', async () => {
		const model = new TCModel(new GVL(completeGVL as never));
		model.cmpId = 28;
		model.cmpVersion = 3;
		model.purposeConsents.set([1, 2]);
		model.vendorConsents.set(755);
		model.vendorsDisclosed.set([1, 755]);
		model.publisherConsents.set([1, 3]);
		model.publisherLegitimateInterests.set(2);
		model.numCustomPurposes = 2;
		model.publisherCustomConsents.set(2);
		const tcString = TCString.encode(model, {
			segments: [Segment.CORE, Segment.VENDORS_DISCLOSED, Segment.PUBLISHER_TC],
		});

		const [core, disclosed, publisher] = await parseTCFEUSection(tcString);
		expect(core).toMatchObject({
			CmpId: 28,
			PurposeConsent: [1, 2],
			VendorConsent: [755],
		});
		expect(disclosed).toEqual({ DisclosedVendors: [1, 755], SegmentType: 1 });
		expect(publisher).toEqual({
			CustomPurposesConsent: [2],
			CustomPurposesLITransparency: [],
			NumCustomPurposes: 2,
			PubPurposesConsent: [1, 3],
			PubPurposesLITransparency: [2],
			SegmentType: 3,
		});
	});
});

describe('createGPP on the server', () => {
	test('mounts and disposes without a window', () => {
		expect(typeof window).toBe('undefined');
		const policy = normalizePolicyRule({
			id: 'us',
			match: { isDefault: true },
			model: 'opt-out',
			prompt: 'none',
		});
		const kernel = createConsentKernel({
			initialLocation: { countryCode: 'US', regionCode: 'CA' },
			initialPolicyResolution: {
				fingerprints: createPolicyRuleFingerprints(policy),
				matchedBy: 'default',
				policy,
				policyId: policy.id,
				status: 'matched',
			},
		});
		const gpp = createGPP({ kernel });
		expect(gpp.getPingData()).toMatchObject({
			applicableSections: [8],
			signalStatus: 'ready',
		});
		expect(gpp.getGPPString()).toMatch(/^DBAB/u);
		gpp.dispose();
		kernel.dispose();
	});
});
