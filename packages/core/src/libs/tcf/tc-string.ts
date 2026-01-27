/**
 * TC String Generation and Decoding
 *
 * Uses @iabtechlabtcf/core to generate and decode IAB TCF TC Strings.
 *
 * @packageDocumentation
 */

import type { GlobalVendorList, TCFConsentData } from '../../types/iab-tcf';
import { getTCFCore } from './lazy-load';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration for TC String generation.
 *
 * @public
 */
export interface TCStringConfig {
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

// ─────────────────────────────────────────────────────────────────────────────
// TC String Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates an IAB TCF TC String from consent data.
 *
 * @param consentData - The consent data to encode
 * @param gvlData - The Global Vendor List
 * @param config - Configuration for the TC String
 * @returns The encoded TC String
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
export async function generateTCString(
	consentData: TCFConsentData,
	gvlData: GlobalVendorList,
	config: TCStringConfig
): Promise<string> {
	const { TCModel, TCString, GVL } = await getTCFCore();

	// Create GVL instance
	// biome-ignore lint/suspicious/noExplicitAny: GVL library types don't match our domain types
	const gvl = new GVL(gvlData as any);

	// Create TC Model
	const tcModel = new TCModel(gvl);

	// Set CMP metadata
	tcModel.cmpId = config.cmpId;
	tcModel.cmpVersion =
		typeof config.cmpVersion === 'number'
			? config.cmpVersion
			: Number.parseInt(String(config.cmpVersion ?? '1'), 10) || 1;
	tcModel.consentScreen = config.consentScreen ?? 1;
	tcModel.consentLanguage = config.consentLanguage ?? 'EN';
	tcModel.publisherCountryCode = config.publisherCountryCode ?? 'US';
	tcModel.isServiceSpecific = config.isServiceSpecific ?? true;

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
		if (value) {
			tcModel.vendorConsents.set(Number(vendorId));
		}
	}

	// Set vendor legitimate interests
	for (const [vendorId, value] of Object.entries(
		consentData.vendorLegitimateInterests
	)) {
		if (value) {
			tcModel.vendorLegitimateInterests.set(Number(vendorId));
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
		if (value) {
			tcModel.vendorsDisclosed.set(Number(vendorId));
		}
	}

	// Encode and return
	return TCString.encode(tcModel);
}

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
}

/**
 * Decodes an IAB TCF TC String.
 *
 * @param tcString - The TC String to decode
 * @returns The decoded consent data
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
export async function decodeTCString(
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
		for (let i = 1; i <= maxId; i++) {
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
		isServiceSpecific: tcModel.isServiceSpecific,
		purposeConsents: vectorToRecord(tcModel.purposeConsents, 11),
		purposeLegitimateInterests: vectorToRecord(
			tcModel.purposeLegitimateInterests,
			11
		),
		vendorConsents: vectorToRecord(tcModel.vendorConsents, 1000),
		vendorLegitimateInterests: vectorToRecord(
			tcModel.vendorLegitimateInterests,
			1000
		),
		specialFeatureOptIns: vectorToRecord(tcModel.specialFeatureOptins, 2),
		vendorsDisclosed: vectorToRecord(tcModel.vendorsDisclosed, 1000),
		created: tcModel.created,
		lastUpdated: tcModel.lastUpdated,
		vendorListVersion: tcModel.vendorListVersion as number,
		policyVersion: tcModel.policyVersion as number,
	};
}

/**
 * Validates a TC String format.
 *
 * @param tcString - The TC String to validate
 * @returns True if the string appears to be a valid TC String format
 *
 * @public
 */
export function isValidTCStringFormat(tcString: string): boolean {
	// TC Strings are base64url encoded and start with a version indicator
	// Version 2 strings typically start with 'C' or 'B' after base64url encoding
	if (!tcString || typeof tcString !== 'string') {
		return false;
	}

	// Basic format check: should be base64url characters
	const base64urlRegex = /^[A-Za-z0-9_-]+$/;
	if (!base64urlRegex.test(tcString)) {
		return false;
	}

	// Should be at least a minimum length to contain header
	if (tcString.length < 10) {
		return false;
	}

	return true;
}

/**
 * Checks if a TC String has consent for a specific vendor.
 *
 * @param tcString - The TC String to check
 * @param vendorId - The vendor ID to check
 * @returns True if the vendor has consent
 *
 * @public
 */
export async function hasVendorConsent(
	tcString: string,
	vendorId: number
): Promise<boolean> {
	const decoded = await decodeTCString(tcString);
	return decoded.vendorConsents[vendorId] === true;
}

/**
 * Checks if a TC String has consent for a specific purpose.
 *
 * @param tcString - The TC String to check
 * @param purposeId - The purpose ID to check (1-11)
 * @returns True if the purpose has consent
 *
 * @public
 */
export async function hasPurposeConsent(
	tcString: string,
	purposeId: number
): Promise<boolean> {
	const decoded = await decodeTCString(tcString);
	return decoded.purposeConsents[purposeId] === true;
}
