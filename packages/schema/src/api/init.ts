import * as v from 'valibot';

import { brandingSchema } from '../shared/branding';
import { globalVendorListSchema } from '../shared/gvl';
import { hostingSchema } from '../shared/hosting';
import { nonIABVendorSchema } from '../shared/non-iab-vendor';
import { policyResolutionWireSchema } from '../shared/policy-wire-schema';
import { vendorSchema } from '../shared/vendor';

/**
 * A title and description pair. Either may be omitted; the client fills
 * gaps from its bundled copy.
 */
export const titleDescriptionSchema = v.object({
	description: v.optional(v.string()),
	title: v.optional(v.string()),
});

/**
 * Cookie banner copy. The notice pair is used when the resolved policy
 * requires a `notice` prompt.
 */
export const cookieBannerTranslationsSchema = v.object({
	...titleDescriptionSchema.entries,
	noticeDescription: v.optional(v.string()),
	noticeTitle: v.optional(v.string()),
});

/** Copy for the vendor rows nested under a category in the preference center. */
export const vendorListTranslationsSchema = v.optional(
	v.object({
		disabledByCategory: v.optional(v.string()),
		privacyPolicy: v.optional(v.string()),
		switchLabel: v.optional(v.string()),
		title: v.optional(v.string()),
	})
);

/** Preference center copy, with the vendor rows' copy alongside. */
export const consentManagerDialogTranslationsSchema = v.object({
	...titleDescriptionSchema.entries,
	vendors: vendorListTranslationsSchema,
});

/**
 * Labels for persistent rights a surface exposes when no prompt action
 * covers them, such as the opt-out and preferences links on a notice.
 */
export const rightsTranslationsSchema = v.optional(
	v.object({
		optOut: v.optional(v.string()),
		preferences: v.optional(v.string()),
	})
);

/**
 * Copy served by `/init`.
 *
 * The backend sends a complete bundle for the resolved language. Keys stay
 * optional because the client merges them over its bundled copy, so a
 * custom transport may send only what it overrides.
 */
export const translationsSchema = v.object({
	common: v.object({
		acceptAll: v.optional(v.string()),
		acknowledge: v.optional(v.string()),
		customize: v.optional(v.string()),
		dismiss: v.optional(v.string()),
		rejectAll: v.optional(v.string()),
		save: v.optional(v.string()),
	}),
	consentGate: v.optional(
		v.object({
			actionButton: v.optional(v.string()),
			title: v.optional(v.string()),
		})
	),
	consentManagerDialog: consentManagerDialogTranslationsSchema,
	consentTypes: v.object({
		experience: v.optional(titleDescriptionSchema),
		functionality: v.optional(titleDescriptionSchema),
		marketing: v.optional(titleDescriptionSchema),
		measurement: v.optional(titleDescriptionSchema),
		necessary: v.optional(titleDescriptionSchema),
	}),
	cookieBanner: cookieBannerTranslationsSchema,
	legalLinks: v.optional(
		v.object({
			cookiePolicy: v.optional(v.string()),
			privacyPolicy: v.optional(v.string()),
			termsOfService: v.optional(v.string()),
		})
	),
	rights: rightsTranslationsSchema,
});

/**
 * Location schema for init output
 */
export const locationSchema = v.object({
	countryCode: v.nullable(v.string()),
	regionCode: v.nullable(v.string()),
});

/**
 * Output schema for init endpoint
 */
export const initOutputSchema = v.object({
	branding: brandingSchema,
	/**
	 * CMP ID registered with IAB Europe.
	 * Provided by the backend when IAB is enabled and a CMP ID is configured.
	 */
	cmpId: v.optional(v.number()),
	/**
	 * Custom vendors not registered with IAB.
	 * These are configured on the backend and synced to the frontend.
	 */
	customVendors: v.optional(v.array(nonIABVendorSchema)),
	/**
	 * Global Vendor List for IAB TCF compliance.
	 * Present when IAB is active for the resolved request policy.
	 * For policy-based setups, non-IAB policies omit this field.
	 * When both this list and gvlReference are absent, IAB is unavailable.
	 */
	gvl: v.optional(v.nullable(globalVendorListSchema)),
	/** Deferred public list and the small summary needed to render the banner. */
	gvlReference: v.optional(
		v.object({
			/** Non-secret policy inputs for a hosted init request. */
			context: v.optional(
				v.object({
					country: v.optional(v.string()),
					gpc: v.optional(v.boolean()),
					region: v.optional(v.string()),
				})
			),
			format: v.optional(v.literal('init')),
			language: v.string(),
			/** Absent when client filtering requires the full list to derive copy. */
			summary: v.optional(
				v.object({
					items: v.array(v.string()),
					vendorCount: v.number(),
				})
			),
			url: v.string(),
			vendorListVersion: v.number(),
		})
	),
	/**
	 * Who runs the backend that answered: `inth` for inth's hosted platform,
	 * `self-hosted` for any other `@c15t/backend`. Informational only: it is
	 * not signed, so a backend can report either value. Absent from backends
	 * that predate the field and from transports with no backend.
	 */
	hosting: v.optional(hostingSchema),
	location: locationSchema,
	/** Explicit, versioned policy outcome for every complete response. */
	policyResolution: policyResolutionWireSchema,
	/**
	 * Signed policy snapshot token to ensure write-time consistency.
	 * Present when backend policy snapshots are configured.
	 */
	policySnapshotToken: v.optional(v.string()),
	/** Privacy signal used to resolve this request; never a recorded choice. */
	resolvedPrivacySignals: v.optional(
		v.object({ gpc: v.optional(v.boolean()) })
	),
	translations: v.object({
		language: v.string(),
		translations: translationsSchema,
	}),
	/**
	 * Version label of the declared vendor list. Shown in the preference
	 * surface and recorded for audit; it never forces re-consent.
	 */
	vendorListVersion: v.optional(v.string()),
	/**
	 * Vendors the publisher declares for vendor-level consent outside IAB.
	 * Merged with vendors declared in code by the client.
	 */
	vendors: v.optional(v.array(vendorSchema)),
});

export type InitOutput = v.InferOutput<typeof initOutputSchema>;
export type TranslationsResponse = v.InferOutput<typeof translationsSchema>;
export type LocationResponse = v.InferOutput<typeof locationSchema>;
