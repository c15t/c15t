/* oxlint-disable no-inline-comments -- Bundlers require pure annotations immediately before the call. */
/**
 * IAB TCF Global Vendor List (GVL) schemas and types.
 *
 * Based on IAB TCF v2.3 specification.
 * @see https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework
 */
import * as v from 'valibot';

// These factories only allocate schemas. Mark the complete construction pure
// so consumers can discard unused GVL schemas, including nested validators.

export const gvlPurposeSchema = /* @__PURE__ */ (() =>
	v.object({
		description: v.string(),
		descriptionLegal: v.optional(v.string()),
		id: v.number(),
		illustrations: v.array(v.string()),
		name: v.string(),
	}))();

export const gvlSpecialPurposeSchema = /* @__PURE__ */ (() =>
	v.object({
		description: v.string(),
		descriptionLegal: v.optional(v.string()),
		id: v.number(),
		illustrations: v.array(v.string()),
		name: v.string(),
	}))();

export const gvlFeatureSchema = /* @__PURE__ */ (() =>
	v.object({
		description: v.string(),
		descriptionLegal: v.optional(v.string()),
		id: v.number(),
		illustrations: v.array(v.string()),
		name: v.string(),
	}))();

export const gvlSpecialFeatureSchema = /* @__PURE__ */ (() =>
	v.object({
		description: v.string(),
		descriptionLegal: v.optional(v.string()),
		id: v.number(),
		illustrations: v.array(v.string()),
		name: v.string(),
	}))();

export const gvlVendorUrlSchema = /* @__PURE__ */ (() =>
	v.object({
		langId: v.string(),
		legIntClaim: v.optional(v.string()),
		privacy: v.optional(v.string()),
	}))();

export const gvlVendorSchema = /* @__PURE__ */ (() =>
	v.object({
		cookieMaxAgeSeconds: v.nullable(v.number()),
		cookieRefresh: v.boolean(),
		dataCategories: v.optional(v.array(v.number())),
		dataRetention: v.optional(
			v.object({
				purposes: v.optional(v.record(v.string(), v.number())),
				specialPurposes: v.optional(v.record(v.string(), v.number())),
				stdRetention: v.optional(v.number()),
			})
		),
		deletedDate: v.optional(v.string()),
		deviceStorageDisclosureUrl: v.optional(v.string()),
		features: v.array(v.number()),
		flexiblePurposes: v.array(v.number()),
		id: v.number(),
		legIntPurposes: v.array(v.number()),
		name: v.string(),
		overflow: v.optional(
			v.object({
				httpGetLimit: v.number(),
			})
		),
		purposes: v.array(v.number()),
		specialFeatures: v.array(v.number()),
		specialPurposes: v.array(v.number()),
		urls: v.array(gvlVendorUrlSchema),
		usesCookies: v.boolean(),
		usesNonCookieAccess: v.boolean(),
	}))();

export const gvlStackSchema = /* @__PURE__ */ (() =>
	v.object({
		description: v.string(),
		id: v.number(),
		name: v.string(),
		purposes: v.array(v.number()),
		specialFeatures: v.array(v.number()),
	}))();

export const gvlDataCategorySchema = /* @__PURE__ */ (() =>
	v.object({
		description: v.string(),
		id: v.number(),
		name: v.string(),
	}))();

export const globalVendorListSchema = /* @__PURE__ */ (() =>
	v.object({
		dataCategories: v.optional(v.record(v.string(), gvlDataCategorySchema)),
		features: v.record(v.string(), gvlFeatureSchema),
		gvlSpecificationVersion: v.number(),
		lastUpdated: v.string(),
		purposes: v.record(v.string(), gvlPurposeSchema),
		specialFeatures: v.record(v.string(), gvlSpecialFeatureSchema),
		specialPurposes: v.record(v.string(), gvlSpecialPurposeSchema),
		stacks: v.record(v.string(), gvlStackSchema),
		tcfPolicyVersion: v.number(),
		vendorListVersion: v.number(),
		vendors: v.record(v.string(), gvlVendorSchema),
	}))();

export type GVLPurpose = v.InferOutput<typeof gvlPurposeSchema>;
export type GVLSpecialPurpose = v.InferOutput<typeof gvlSpecialPurposeSchema>;
export type GVLFeature = v.InferOutput<typeof gvlFeatureSchema>;
export type GVLSpecialFeature = v.InferOutput<typeof gvlSpecialFeatureSchema>;
export type GVLVendorUrl = v.InferOutput<typeof gvlVendorUrlSchema>;
export type GVLVendor = v.InferOutput<typeof gvlVendorSchema>;
export type GVLStack = v.InferOutput<typeof gvlStackSchema>;
export type GVLDataCategory = v.InferOutput<typeof gvlDataCategorySchema>;
export type GlobalVendorList = v.InferOutput<typeof globalVendorListSchema>;
