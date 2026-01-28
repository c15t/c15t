/**
 * Non-IAB Vendor Schema
 *
 * Valibot schema for custom vendors not registered with IAB.
 * These vendors must manually declare their data practices for transparency.
 *
 * @packageDocumentation
 */

import * as v from 'valibot';

/**
 * Schema for a custom vendor not registered with IAB.
 *
 * These vendors process data based on user consent but are not part of the
 * IAB Transparency & Consent Framework. They must manually declare all their
 * data practices to maintain the same level of transparency as IAB vendors.
 */
export const nonIABVendorSchema = v.object({
	/**
	 * Unique identifier for the vendor.
	 * Should be a slug-like string (e.g., 'internal-analytics', 'live-chat').
	 */
	id: v.string(),

	/** Display name shown to users */
	name: v.string(),

	/** Privacy policy URL (required for transparency) */
	privacyPolicyUrl: v.pipe(v.string(), v.url()),

	/** Description of what this vendor does */
	description: v.optional(v.string()),

	// Purpose Declaration (uses IAB purpose IDs 1-11 for consistency)

	/**
	 * IAB purposes this vendor requires consent for.
	 * Uses standard IAB purpose IDs (1-11) for consistency.
	 */
	purposes: v.array(
		v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(11))
	),

	/**
	 * IAB purposes this vendor claims legitimate interest for.
	 * Users can object to these purposes.
	 */
	legIntPurposes: v.optional(
		v.array(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(11)))
	),

	// Feature Declaration (uses IAB feature IDs for consistency)

	/**
	 * Features this vendor uses (IAB feature IDs 1-3).
	 */
	features: v.optional(
		v.array(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(3)))
	),

	/**
	 * Special features requiring explicit opt-in (IAB special feature IDs 1-2).
	 */
	specialFeatures: v.optional(
		v.array(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(2)))
	),

	// Data Declaration (uses IAB data category IDs for consistency)

	/**
	 * Data categories collected/used (IAB data category IDs 1-11).
	 */
	dataCategories: v.optional(
		v.array(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(11)))
	),

	// Storage Declaration

	/** Maximum cookie/storage duration in seconds */
	cookieMaxAgeSeconds: v.optional(
		v.pipe(v.number(), v.integer(), v.minValue(1))
	),

	/** Whether this vendor uses cookies */
	usesCookies: v.optional(v.boolean()),

	/** Whether this vendor uses non-cookie storage (localStorage, IndexedDB, etc.) */
	usesNonCookieAccess: v.optional(v.boolean()),

	/** How long data is retained (in days) */
	dataRetentionDays: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
});

/**
 * Schema for consent state of a non-IAB vendor.
 */
export const nonIABVendorConsentSchema = v.object({
	/** Vendor ID */
	vendorId: v.string(),

	/** Whether the user has consented */
	consented: v.boolean(),

	/** Timestamp when consent was given/modified */
	timestamp: v.number(),
});

export type NonIABVendor = v.InferOutput<typeof nonIABVendorSchema>;
export type NonIABVendorConsent = v.InferOutput<
	typeof nonIABVendorConsentSchema
>;
