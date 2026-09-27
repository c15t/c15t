/**
 * TC String Generation and Decoding
 *
 * Uses @iabtechlabtcf/core to generate and decode IAB TCF TC Strings.
 *
 * @packageDocumentation
 */

import type { GlobalVendorList } from '@c15t/core';
import type { PurposeRestrictionVector } from '@iabtechlabtcf/core';

import type { PublisherRestriction, TCFConsentData } from './iab-tcf-types';
import { getTCFCore } from './lazy-load';
import {
	PublisherRestrictionError,
	validatePublisherRestrictions,
} from './publisher-restrictions';

/**
 * Configuration for TC String generation.
 *
 * @public
 */
export interface TCStringConfig {
	/** Original confirmation time, captured before asynchronous codec loading. */
	confirmedAt?: number;
	/** CMP ID registered with IAB */
	cmpId: number;

	/** CMP version (number for TC model; string from ~/cmp-defaults is coerced) */
	cmpVersion?: number | string;

	/** Consent screen ID */
	consentScreen?: number;

	/** Consent language (2-letter code) */
	consentLanguage?: string;

	/** Publisher country code (2-letter code) */
	publisherCountryCode?: string;

	/** Whether consent is service-specific (not global) */
	isServiceSpecific?: boolean;
}

/**
 * Generates an IAB TCF TC String from consent data.
 *
 * @param consentData - The consent data to encode
 * @param gvlData - The Global Vendor List
 * @param config - Configuration for the TC String
 * @returns The encoded TC String
 * @throws {TypeError} When `config.confirmedAt` is not a past or current
 * timestamp.
 * @throws {PublisherRestrictionError} When a publisher restriction cannot
 * be encoded for the vendor list. See {@link validatePublisherRestrictions}.
 *
 * @example
 * ```typescript
 * const tcString = await generateTCString(
 *   {
 *     purposeConsents: { 1: true, 2: true, 7: true },
 *     purposeLegitimateInterests: { 9: true, 10: true },
 *     vendorConsents: { 1: true, 755: true },
 *     vendorLegitimateInterests: { 1: true },
 *     specialFeatureOptIns: { 1: false, 2: false },
 *   },
 *   gvl,
 *   { cmpId: 28, cmpVersion: 1 }
 * );
 * ```
 *
 * @public
 */
// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
export const generateTCString = async function generateTCString(
	consentData: TCFConsentData,
	gvlData: GlobalVendorList,
	config: TCStringConfig
): Promise<string> {
	const now = Date.now();
	const confirmedAt =
		config.confirmedAt === undefined ? now : config.confirmedAt;
	if (
		!Number.isSafeInteger(confirmedAt) ||
		confirmedAt < 0 ||
		confirmedAt > now
	) {
		throw new TypeError(
			'TC confirmation time must be a valid past or current timestamp.'
		);
	}
	const isServiceSpecific = config.isServiceSpecific ?? true;
	const publisherRestrictions = validatePublisherRestrictions(
		consentData.publisherRestrictions,
		{ gvl: gvlData, isServiceSpecific }
	);
	const { TCModel, TCString, GVL, PurposeRestriction } = await getTCFCore();

	// Create GVL instance
	// oxlint-disable-next-line typescript/no-explicit-any -- GVL library types don't match our domain types
	const gvl = new GVL(gvlData as any);

	// Create TC Model
	const tcModel = new TCModel(gvl);
	const confirmedDay = new Date(
		Math.floor(confirmedAt / 86_400_000) * 86_400_000
	);
	tcModel.created = confirmedDay;
	tcModel.lastUpdated = confirmedDay;

	// Set CMP metadata
	tcModel.cmpId = config.cmpId;
	tcModel.cmpVersion =
		typeof config.cmpVersion === 'number'
			? config.cmpVersion
			: Number.parseInt(String(config.cmpVersion ?? '1'), 10) || 1;
	tcModel.consentScreen = config.consentScreen ?? 1;
	tcModel.consentLanguage = config.consentLanguage ?? 'EN';
	tcModel.publisherCountryCode = config.publisherCountryCode ?? 'US';
	tcModel.isServiceSpecific = isServiceSpecific;

	// Set purpose consents
	for (const [purposeId, value] of Object.entries(
		consentData.purposeConsents
	)) {
		if (value) {
			tcModel.purposeConsents.set(Number(purposeId));
		}
	}

	// Set purpose legitimate interests
	for (const [purposeId, value] of Object.entries(
		consentData.purposeLegitimateInterests
	)) {
		if (value) {
			tcModel.purposeLegitimateInterests.set(Number(purposeId));
		}
	}

	// Set vendor consents
	for (const [vendorId, value] of Object.entries(consentData.vendorConsents)) {
		const numericVendorId = Number(vendorId);
		if (value && Number.isFinite(numericVendorId)) {
			tcModel.vendorConsents.set(numericVendorId);
		}
	}

	// Set vendor legitimate interests
	for (const [vendorId, value] of Object.entries(
		consentData.vendorLegitimateInterests
	)) {
		const numericVendorId = Number(vendorId);
		if (value && Number.isFinite(numericVendorId)) {
			tcModel.vendorLegitimateInterests.set(numericVendorId);
		}
	}

	// Set special feature opt-ins
	for (const [featureId, value] of Object.entries(
		consentData.specialFeatureOptIns
	)) {
		if (value) {
			tcModel.specialFeatureOptins.set(Number(featureId));
		}
	}

	// Set vendors disclosed (TCF 2.3 requirement)
	// This indicates which vendors were shown to the user in the CMP UI
	for (const [vendorId, value] of Object.entries(
		consentData.vendorsDisclosed
	)) {
		if (value && /^\d+$/u.test(vendorId) && Number(vendorId) > 0) {
			tcModel.vendorsDisclosed.set(Number(vendorId));
		}
	}

	// The encoder drops restrictions its vendor list does not allow. Those
	// were rejected above; confirm none was dropped anyway.
	for (const {
		purposeId,
		restrictionType,
		vendorIds,
	} of publisherRestrictions) {
		const restriction = new PurposeRestriction(purposeId, restrictionType);
		for (const vendorId of vendorIds) {
			tcModel.publisherRestrictions.add(vendorId, restriction);
			if (
				tcModel.publisherRestrictions.getRestrictionType(
					vendorId,
					purposeId
				) !== restrictionType
			) {
				throw new PublisherRestrictionError(
					`The TC string encoder rejected restriction type ${restrictionType} for vendor ${vendorId} and purpose ${purposeId}.`
				);
			}
		}
	}

	// Encode and return
	return TCString.encode(tcModel);
};

/**
 * Reads restrictions from a decoded purpose restriction vector.
 */
const readPublisherRestrictions = function readPublisherRestrictions(
	vector: PurposeRestrictionVector,
	isServiceSpecific: boolean
): PublisherRestriction[] {
	return validatePublisherRestrictions(
		vector.getRestrictions().map((restriction) => ({
			purposeId: restriction.purposeId,
			restrictionType: restriction.restrictionType,
			vendorIds: vector.getVendors(restriction),
		})),
		{ isServiceSpecific }
	);
};

/**
 * Decoded TC String data.
 *
 * @public
 */
export interface DecodedTCString {
	/** CMP ID */
	cmpId: number;

	/** CMP version */
	cmpVersion: number;

	/** Consent language */
	consentLanguage: string;

	/** Whether consent is service-specific */
	isServiceSpecific: boolean;

	/** Purpose consents */
	purposeConsents: Record<number, boolean>;

	/** Purpose legitimate interests */
	purposeLegitimateInterests: Record<number, boolean>;

	/** Vendor consents */
	vendorConsents: Record<number, boolean>;

	/** Vendor legitimate interests */
	vendorLegitimateInterests: Record<number, boolean>;

	/** Special feature opt-ins */
	specialFeatureOptIns: Record<number, boolean>;

	/** Vendors that were disclosed to the user in the CMP UI (TCF 2.3) */
	vendorsDisclosed: Record<number, boolean>;

	/** Created date */
	created: Date;

	/** Last updated date */
	lastUpdated: Date;

	/** GVL version used */
	vendorListVersion: number;

	/** Policy version */
	policyVersion: number;

	/**
	 * Publisher restrictions, ordered by purpose then type. Vendor ranges are
	 * expanded; a range may include IDs missing from the vendor list.
	 */
	publisherRestrictions: PublisherRestriction[];
}

/**
 * Decodes an IAB TCF TC String.
 *
 * @param tcString - The TC String to decode
 * @returns The decoded consent data
 * @throws {Error} When the string is not a valid TC string, including a
 * restriction with the reserved type `3`, purpose ID `0` or a vendor range
 * that ends before it starts.
 * @throws {PublisherRestrictionError} When the string carries a
 * restriction c15t does not support: vendor ID `0`, legitimate interest
 * required for a consent-only purpose, two types for one vendor and
 * purpose, or any restriction in a string that is not service-specific.
 *
 * @example
 * ```typescript
 * const decoded = await decodeTCString(tcString);
 * console.log(decoded.purposeConsents); // { 1: true, 2: true, ... }
 * console.log(decoded.vendorConsents); // { 1: true, 755: true, ... }
 * ```
 *
 * @public
 */
export const decodeTCString = async function decodeTCString(
	tcString: string
): Promise<DecodedTCString> {
	const { TCString } = await getTCFCore();

	const tcModel = TCString.decode(tcString);

	// Convert Vector to Record
	const vectorToRecord = (
		vector: { has: (id: number) => boolean },
		maxId: number
	): Record<number, boolean> => {
		const record: Record<number, boolean> = {};
		for (let i = 1; i <= maxId; i += 1) {
			if (vector.has(i)) {
				record[i] = true;
			}
		}
		return record;
	};

	return {
		cmpId: tcModel.cmpId as number,
		cmpVersion: tcModel.cmpVersion as number,
		consentLanguage: tcModel.consentLanguage,
		created: tcModel.created,
		isServiceSpecific: tcModel.isServiceSpecific,
		lastUpdated: tcModel.lastUpdated,
		policyVersion: tcModel.policyVersion as number,
		publisherRestrictions: readPublisherRestrictions(
			tcModel.publisherRestrictions,
			tcModel.isServiceSpecific
		),
		purposeConsents: vectorToRecord(tcModel.purposeConsents, 11),
		purposeLegitimateInterests: vectorToRecord(
			tcModel.purposeLegitimateInterests,
			11
		),
		specialFeatureOptIns: vectorToRecord(tcModel.specialFeatureOptins, 2),
		vendorConsents: vectorToRecord(
			tcModel.vendorConsents,
			tcModel.vendorConsents.maxId
		),
		vendorLegitimateInterests: vectorToRecord(
			tcModel.vendorLegitimateInterests,
			tcModel.vendorLegitimateInterests.maxId
		),
		vendorListVersion: tcModel.vendorListVersion as number,
		vendorsDisclosed: vectorToRecord(
			tcModel.vendorsDisclosed,
			tcModel.vendorsDisclosed.maxId
		),
	};
};

/**
 * Validates a TC String format.
 *
 * @param tcString - The TC String to validate
 * @returns True if the string appears to be a valid TC String format
 *
 * @public
 */
export const isValidTCStringFormat = function isValidTCStringFormat(
	tcString: string
): boolean {
	// TC Strings are base64url encoded and start with a version indicator
	// Version 2 strings typically start with 'C' or 'B' after base64url encoding
	if (!tcString || typeof tcString !== 'string') {
		return false;
	}

	// Basic format check: should be base64url characters
	const base64urlRegex = /^[A-Za-z0-9_-]+$/u;
	if (!base64urlRegex.test(tcString)) {
		return false;
	}

	// Should be at least a minimum length to contain header
	if (tcString.length < 10) {
		return false;
	}

	return true;
};

/**
 * Checks if a TC String has consent for a specific vendor.
 *
 * @param tcString - The TC String to check
 * @param vendorId - The vendor ID to check
 * @returns True if the vendor has consent
 *
 * @public
 */
export const hasVendorConsent = async function hasVendorConsent(
	tcString: string,
	vendorId: number
): Promise<boolean> {
	const decoded = await decodeTCString(tcString);
	return decoded.vendorConsents[vendorId] === true;
};

/**
 * Checks if a TC String has consent for a specific purpose.
 *
 * @param tcString - The TC String to check
 * @param purposeId - The purpose ID to check (1-11)
 * @returns True if the purpose has consent
 *
 * @public
 */
export const hasPurposeConsent = async function hasPurposeConsent(
	tcString: string,
	purposeId: number
): Promise<boolean> {
	const decoded = await decodeTCString(tcString);
	return decoded.purposeConsents[purposeId] === true;
};
