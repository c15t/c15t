/**
 * Non-IAB Vendor Schema
 *
 * Zod schema for custom vendors not registered with IAB.
 * These vendors must manually declare their data practices for transparency.
 *
 * @packageDocumentation
 */

import { z } from 'zod';

/**
 * Schema for a custom vendor not registered with IAB.
 *
 * These vendors process data based on user consent but are not part of the
 * IAB Transparency & Consent Framework. They must manually declare all their
 * data practices to maintain the same level of transparency as IAB vendors.
 */
export const nonIABVendorSchema = z.object({
	/**
	 * Unique identifier for the vendor.
	 * Should be a slug-like string (e.g., 'internal-analytics', 'live-chat').
	 */
	id: z.string(),

	/** Display name shown to users */
	name: z.string(),

	/** Privacy policy URL (required for transparency) */
	privacyPolicyUrl: z.string().url(),

	/** Description of what this vendor does */
	description: z.string().optional(),

	// Purpose Declaration (uses IAB purpose IDs 1-11 for consistency)

	/**
	 * IAB purposes this vendor requires consent for.
	 * Uses standard IAB purpose IDs (1-11) for consistency.
	 */
	purposes: z.array(z.number().int().min(1).max(11)),

	/**
	 * IAB purposes this vendor claims legitimate interest for.
	 * Users can object to these purposes.
	 */
	legIntPurposes: z.array(z.number().int().min(1).max(11)).optional(),

	// Feature Declaration (uses IAB feature IDs for consistency)

	/**
	 * Features this vendor uses (IAB feature IDs 1-3).
	 */
	features: z.array(z.number().int().min(1).max(3)).optional(),

	/**
	 * Special features requiring explicit opt-in (IAB special feature IDs 1-2).
	 */
	specialFeatures: z.array(z.number().int().min(1).max(2)).optional(),

	// Data Declaration (uses IAB data category IDs for consistency)

	/**
	 * Data categories collected/used (IAB data category IDs 1-11).
	 */
	dataCategories: z.array(z.number().int().min(1).max(11)).optional(),

	// Storage Declaration

	/** Maximum cookie/storage duration in seconds */
	cookieMaxAgeSeconds: z.number().int().positive().optional(),

	/** Whether this vendor uses cookies */
	usesCookies: z.boolean().optional(),

	/** Whether this vendor uses non-cookie storage (localStorage, IndexedDB, etc.) */
	usesNonCookieAccess: z.boolean().optional(),

	/** How long data is retained (in days) */
	dataRetentionDays: z.number().int().positive().optional(),
});

/**
 * Schema for consent state of a non-IAB vendor.
 */
export const nonIABVendorConsentSchema = z.object({
	/** Vendor ID */
	vendorId: z.string(),

	/** Whether the user has consented */
	consented: z.boolean(),

	/** Timestamp when consent was given/modified */
	timestamp: z.number(),
});

export type NonIABVendor = z.infer<typeof nonIABVendorSchema>;
export type NonIABVendorConsent = z.infer<typeof nonIABVendorConsentSchema>;
