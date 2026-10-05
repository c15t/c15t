/**
 * The TCF EU v2 section of a GPP string.
 *
 * The section string is the TC String the TCF CMP confirmed, embedded as
 * is. Its parsed form, for `parsedSections`, follows the field names of the
 * GPP IAB Europe TCF section specification and is decoded with the lazily
 * loaded TCF core library, which a TC String already required.
 *
 * @packageDocumentation
 */

import { getTCFCore } from '../tcf/lazy-load';
import type { GPPParsedSubsection } from './types';

const BASE64_URL =
	'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Segment type of the disclosed vendors segment. */
const DISCLOSED_VENDORS = 1;
/** Segment type of the publisher purposes segment. */
const PUBLISHER_PURPOSES = 3;

interface IdVector {
	maxId: number;
	has: (id: number) => boolean;
}

/** IDs set in a vector, in ascending order. */
const idsOf = function idsOf(vector: IdVector, maxId = vector.maxId): number[] {
	const ids: number[] = [];
	for (let id = 1; id <= maxId; id += 1) {
		if (vector.has(id)) {
			ids.push(id);
		}
	}
	return ids;
};

/**
 * Segment types after the core segment, in string order. A segment's type
 * is its first three bits.
 */
const segmentTypes = function segmentTypes(tcString: string): number[] {
	return tcString
		.split('.')
		.slice(1)
		.map((segment) => Math.floor(BASE64_URL.indexOf(segment.charAt(0)) / 8));
};

/**
 * Decodes a TC String into the subsections `parsedSections.tcfeuv2` holds:
 * the core segment, then the disclosed vendors and publisher purposes
 * segments the string contains, in string order. Bitfields and vendor
 * ranges are arrays of the IDs that are set; dates are `Date` objects.
 *
 * @param tcString - A TC String.
 * @returns Parsed subsections.
 * @throws {Error} When the string cannot be decoded.
 */
export const parseTCFEUSection = async function parseTCFEUSection(
	tcString: string
): Promise<GPPParsedSubsection[]> {
	const { TCString } = await getTCFCore();
	const model = TCString.decode(tcString);
	const restrictions = model.publisherRestrictions;
	const core: GPPParsedSubsection = {
		CmpId: Number(model.cmpId),
		CmpVersion: Number(model.cmpVersion),
		ConsentLanguage: model.consentLanguage.toUpperCase(),
		ConsentScreen: Number(model.consentScreen),
		Created: model.created,
		IsServiceSpecific: model.isServiceSpecific,
		LastUpdated: model.lastUpdated,
		PubRestrictions: restrictions.getRestrictions().map((restriction) => ({
			Ids: restrictions.getVendors(restriction),
			Key: restriction.purposeId,
			Type: restriction.restrictionType,
		})),
		PublisherCC: model.publisherCountryCode,
		PurposeConsent: idsOf(model.purposeConsents, 24),
		PurposeOneTreatment: model.purposeOneTreatment,
		PurposesLITransparency: idsOf(model.purposeLegitimateInterests, 24),
		SpecialFeatureOptIns: idsOf(model.specialFeatureOptins, 12),
		TcfPolicyVersion: Number(model.policyVersion),
		UseNonStandardTexts: model.useNonStandardTexts,
		VendorConsent: idsOf(model.vendorConsents),
		VendorLegitimateInterest: idsOf(model.vendorLegitimateInterests),
		VendorListVersion: Number(model.vendorListVersion),
		Version: Number(model.version),
	};
	const subsections = [core];
	for (const type of segmentTypes(tcString)) {
		if (type === DISCLOSED_VENDORS) {
			subsections.push({
				DisclosedVendors: idsOf(model.vendorsDisclosed),
				SegmentType: DISCLOSED_VENDORS,
			});
		} else if (type === PUBLISHER_PURPOSES) {
			const custom = Number(model.numCustomPurposes);
			subsections.push({
				CustomPurposesConsent: idsOf(model.publisherCustomConsents, custom),
				CustomPurposesLITransparency: idsOf(
					model.publisherCustomLegitimateInterests,
					custom
				),
				NumCustomPurposes: custom,
				PubPurposesConsent: idsOf(model.publisherConsents, 24),
				PubPurposesLITransparency: idsOf(
					model.publisherLegitimateInterests,
					24
				),
				SegmentType: PUBLISHER_PURPOSES,
			});
		}
	}
	return subsections;
};
