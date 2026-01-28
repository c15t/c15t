/**
 * Non-IAB Vendor Types
 *
 * Type definitions for custom vendors not registered with IAB.
 * These vendors must manually declare their data practices for transparency.
 *
 * @packageDocumentation
 */

/**
 * A custom vendor not registered with IAB.
 *
 * These vendors process data based on user consent but are not part of the
 * IAB Transparency & Consent Framework. They must manually declare all their
 * data practices to maintain the same level of transparency as IAB vendors.
 *
 * @remarks
 * Custom vendors are displayed separately in the consent UI with a note
 * that they have different privacy practices than IAB-registered vendors.
 *
 * @example
 * ```typescript
 * const internalAnalytics: NonIABVendor = {
 *   id: 'internal-analytics',
 *   name: 'Our Analytics Platform',
 *   description: 'First-party analytics to understand site usage',
 *   privacyPolicyUrl: 'https://example.com/privacy',
 *   purposes: [1, 8, 10],  // Storage, content measurement, develop services
 *   dataCategories: [1, 2, 6, 8],
 *   usesCookies: true,
 *   cookieMaxAgeSeconds: 31536000,
 * };
 * ```
 *
 * @public
 */
export interface NonIABVendor {
	/**
	 * Unique identifier for the vendor.
	 *
	 * Should be a slug-like string (e.g., 'internal-analytics', 'live-chat').
	 */
	id: string;

	/** Display name shown to users */
	name: string;

	/** Privacy policy URL (required for transparency) */
	privacyPolicyUrl: string;

	/** Description of what this vendor does */
	description?: string;

	// ─────────────────────────────────────────────────────────────────────────
	// Purpose Declaration (uses IAB purpose IDs 1-11 for consistency)
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * IAB purposes this vendor requires consent for.
	 *
	 * Uses standard IAB purpose IDs for consistency:
	 * - 1: Store and/or access information on a device
	 * - 2: Use limited data to select advertising
	 * - 3: Create profiles for personalised advertising
	 * - 4: Use profiles to select personalised advertising
	 * - 5: Create profiles to personalise content
	 * - 6: Use profiles to select personalised content
	 * - 7: Measure advertising performance
	 * - 8: Measure content performance
	 * - 9: Understand audiences through statistics
	 * - 10: Develop and improve services
	 * - 11: Use limited data to select content
	 *
	 * @example [1, 7, 8] // Storage, ad measurement, content measurement
	 */
	purposes: number[];

	/**
	 * IAB purposes this vendor claims legitimate interest for.
	 *
	 * Users can object to these purposes.
	 */
	legIntPurposes?: number[];

	// ─────────────────────────────────────────────────────────────────────────
	// Feature Declaration (uses IAB feature IDs for consistency)
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Features this vendor uses (IAB feature IDs 1-3).
	 *
	 * - 1: Match and combine data from other sources
	 * - 2: Link different devices
	 * - 3: Identify devices based on info transmitted automatically
	 */
	features?: number[];

	/**
	 * Special features requiring explicit opt-in (IAB special feature IDs 1-2).
	 *
	 * - 1: Use precise geolocation data
	 * - 2: Actively scan device characteristics for identification
	 */
	specialFeatures?: number[];

	// ─────────────────────────────────────────────────────────────────────────
	// Data Declaration (uses IAB data category IDs for consistency)
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Data categories collected/used (IAB data category IDs 1-11).
	 *
	 * - 1: IP addresses
	 * - 2: Device characteristics
	 * - 3: Device identifiers
	 * - 4: Probabilistic identifiers
	 * - 5: Authentication-derived identifiers
	 * - 6: Browsing and interaction data
	 * - 7: User-provided data
	 * - 8: Non-precise location data
	 * - 9: Precise location data
	 * - 10: Users' profiles
	 * - 11: Privacy choices
	 */
	dataCategories?: number[];

	// ─────────────────────────────────────────────────────────────────────────
	// Storage Declaration
	// ─────────────────────────────────────────────────────────────────────────

	/** Maximum cookie/storage duration in seconds */
	cookieMaxAgeSeconds?: number;

	/** Whether this vendor uses cookies */
	usesCookies?: boolean;

	/** Whether this vendor uses non-cookie storage (localStorage, IndexedDB, etc.) */
	usesNonCookieAccess?: boolean;

	/** How long data is retained (in days) */
	dataRetentionDays?: number;
}

/**
 * Consent state for a non-IAB vendor.
 *
 * @public
 */
export interface NonIABVendorConsent {
	/** Vendor ID */
	vendorId: string;

	/** Whether the user has consented */
	consented: boolean;

	/** Timestamp when consent was given/modified */
	timestamp: number;
}
