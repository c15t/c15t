/**
 * The TCF EU v2 section of a GPP string.
 *
 * The section string is the TC String the TCF CMP confirmed, embedded as
 * is. Its parsed form is decoded with the lazily loaded TCF core library,
 * which a TC String already required.
 *
 * @packageDocumentation
 */

import { getTCFCore } from '../tcf/lazy-load';

/** Ids set in a TCF vector, in ascending order. */
const idsOf = function idsOf(vector: {
	maxId: number;
	has: (id: number) => boolean;
}): number[] {
	const ids: number[] = [];
	for (let id = 1; id <= vector.maxId; id += 1) {
		if (vector.has(id)) {
			ids.push(id);
		}
	}
	return ids;
};

/** A fixed bitfield as booleans, index 0 holding ID 1. */
const bitfield = function bitfield(
	vector: { has: (id: number) => boolean },
	length: number
): boolean[] {
	return Array.from({ length }, (_, index) => vector.has(index + 1));
};

/**
 * Decodes a TC String into the subsections `getSection('tcfeuv2')` returns:
 * the core subsection and, when the string discloses vendors, the disclosed
 * vendors subsection. Publisher restrictions and publisher purposes are not
 * included; read them from the TC String or `__tcfapi`.
 *
 * @param tcString - A TC String.
 * @returns Parsed subsections.
 * @throws {Error} When the string cannot be decoded.
 */
export const parseTCFEUSection = async function parseTCFEUSection(
	tcString: string
): Promise<Record<string, unknown>[]> {
	const { TCString } = await getTCFCore();
	const model = TCString.decode(tcString);
	const core: Record<string, unknown> = {
		CmpId: Number(model.cmpId),
		CmpVersion: Number(model.cmpVersion),
		ConsentLanguage: model.consentLanguage.toUpperCase(),
		ConsentScreen: Number(model.consentScreen),
		Created: model.created,
		IsServiceSpecific: model.isServiceSpecific,
		LastUpdated: model.lastUpdated,
		PolicyVersion: Number(model.policyVersion),
		PublisherCountryCode: model.publisherCountryCode,
		PurposeConsents: bitfield(model.purposeConsents, 24),
		PurposeLegitimateInterests: bitfield(model.purposeLegitimateInterests, 24),
		PurposeOneTreatment: model.purposeOneTreatment,
		SpecialFeatureOptins: bitfield(model.specialFeatureOptins, 12),
		UseNonStandardStacks: model.useNonStandardTexts,
		VendorConsents: idsOf(model.vendorConsents),
		VendorLegitimateInterests: idsOf(model.vendorLegitimateInterests),
		VendorListVersion: Number(model.vendorListVersion),
		Version: Number(model.version),
	};
	const disclosed = idsOf(model.vendorsDisclosed);
	return disclosed.length > 0
		? [core, { VendorsDisclosed: disclosed, VendorsDisclosedSegmentType: 1 }]
		: [core];
};
