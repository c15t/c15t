/**
 * IAB TCF Global Vendor List (GVL) schemas and types.
 *
 * Based on IAB TCF v2.4 specification.
 * @see https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework
 */
import * as v from 'valibot';

export const gvlPurposeSchema = v.object({
	id: v.number(),
	name: v.string(),
	description: v.string(),
	illustrations: v.array(v.string()),
	descriptionLegal: v.optional(v.string()),
});

export const gvlSpecialPurposeSchema = v.object({
	id: v.number(),
	name: v.string(),
	description: v.string(),
	illustrations: v.array(v.string()),
	descriptionLegal: v.optional(v.string()),
});

export const gvlFeatureSchema = v.object({
	id: v.number(),
	name: v.string(),
	description: v.string(),
	illustrations: v.array(v.string()),
	descriptionLegal: v.optional(v.string()),
});

export const gvlSpecialFeatureSchema = v.object({
	id: v.number(),
	name: v.string(),
	description: v.string(),
	illustrations: v.array(v.string()),
	descriptionLegal: v.optional(v.string()),
});

export const gvlVendorUrlSchema = v.object({
	langId: v.string(),
	privacy: v.optional(v.string()),
	legIntClaim: v.optional(v.string()),
});

export const gvlVendorSchema = v.object({
	id: v.number(),
	name: v.string(),
	purposes: v.array(v.number()),
	legIntPurposes: v.array(v.number()),
	flexiblePurposes: v.array(v.number()),
	specialPurposes: v.array(v.number()),
	features: v.array(v.number()),
	specialFeatures: v.array(v.number()),
	cookieMaxAgeSeconds: v.nullable(v.number()),
	usesCookies: v.boolean(),
	cookieRefresh: v.boolean(),
	usesNonCookieAccess: v.boolean(),
	urls: v.array(gvlVendorUrlSchema),
	deviceStorageDisclosureUrl: v.optional(v.string()),
	dataCategories: v.optional(v.array(v.number())),
	dataRetention: v.optional(
		v.object({
			purposes: v.optional(v.record(v.string(), v.number())),
			specialPurposes: v.optional(v.record(v.string(), v.number())),
			stdRetention: v.optional(v.number()),
		})
	),
	deletedDate: v.optional(v.string()),
	overflow: v.optional(
		v.object({
			httpGetLimit: v.number(),
		})
	),
});

export const gvlStackSchema = v.object({
	id: v.number(),
	name: v.string(),
	description: v.string(),
	purposes: v.array(v.number()),
	specialFeatures: v.array(v.number()),
});

export const gvlDataCategorySchema = v.object({
	id: v.number(),
	name: v.string(),
	description: v.string(),
});

/**
 * Standard texts that IAB publishes with the GVL.
 *
 * TCF Policies v5.0.b require CMPs to show `features` next to the list of
 * Features. The other keys are reserved by IAB and may be absent.
 */
export const gvlStandardTextsSchema = v.object({
	/** Text shown with the Features section of the CMP UI. */
	features: v.string(),
	/** Standard text for Purposes, if IAB publishes one. */
	purposes: v.optional(v.string()),
	/** Standard text for Special Purposes, if IAB publishes one. */
	specialPurposes: v.optional(v.string()),
	/** Standard text for Special Features, if IAB publishes one. */
	specialFeatures: v.optional(v.string()),
});

export const globalVendorListSchema = v.object({
	gvlSpecificationVersion: v.number(),
	vendorListVersion: v.number(),
	tcfPolicyVersion: v.number(),
	lastUpdated: v.string(),
	purposes: v.record(v.string(), gvlPurposeSchema),
	specialPurposes: v.record(v.string(), gvlSpecialPurposeSchema),
	features: v.record(v.string(), gvlFeatureSchema),
	specialFeatures: v.record(v.string(), gvlSpecialFeatureSchema),
	vendors: v.record(v.string(), gvlVendorSchema),
	stacks: v.record(v.string(), gvlStackSchema),
	dataCategories: v.optional(v.record(v.string(), gvlDataCategorySchema)),
	/** Standard texts published with the GVL (TCF Policies v5.0.b). */
	standardTexts: v.optional(gvlStandardTextsSchema),
});

export type GVLPurpose = v.InferOutput<typeof gvlPurposeSchema>;
export type GVLSpecialPurpose = v.InferOutput<typeof gvlSpecialPurposeSchema>;
export type GVLFeature = v.InferOutput<typeof gvlFeatureSchema>;
export type GVLSpecialFeature = v.InferOutput<typeof gvlSpecialFeatureSchema>;
export type GVLVendorUrl = v.InferOutput<typeof gvlVendorUrlSchema>;
export type GVLVendor = v.InferOutput<typeof gvlVendorSchema>;
export type GVLStack = v.InferOutput<typeof gvlStackSchema>;
export type GVLDataCategory = v.InferOutput<typeof gvlDataCategorySchema>;
export type GVLStandardTexts = v.InferOutput<typeof gvlStandardTextsSchema>;
export type GlobalVendorList = v.InferOutput<typeof globalVendorListSchema>;
