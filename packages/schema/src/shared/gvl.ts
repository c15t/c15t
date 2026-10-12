/* oxlint-disable no-inline-comments -- Bundlers require pure annotations immediately before the call. */
/**
 * IAB TCF Global Vendor List (GVL) schemas and types.
 *
 * Based on IAB TCF v2.4 specification.
 *
 * Every object schema is loose: fields the IAB adds to the vendor list later
 * pass through validation instead of being stripped.
 *
 * @see https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework
 */
import * as v from 'valibot';

// These factories only allocate schemas. Mark the complete construction pure
// so consumers can discard unused GVL schemas, including nested validators.

export const gvlPurposeSchema = /* @__PURE__ */ (() =>
	v.looseObject({
		description: v.string(),
		descriptionLegal: v.optional(v.string()),
		id: v.number(),
		illustrations: v.array(v.string()),
		name: v.string(),
	}))();

export const gvlSpecialPurposeSchema = /* @__PURE__ */ (() =>
	v.looseObject({
		description: v.string(),
		descriptionLegal: v.optional(v.string()),
		id: v.number(),
		illustrations: v.array(v.string()),
		name: v.string(),
	}))();

export const gvlFeatureSchema = /* @__PURE__ */ (() =>
	v.looseObject({
		description: v.string(),
		descriptionLegal: v.optional(v.string()),
		id: v.number(),
		illustrations: v.array(v.string()),
		name: v.string(),
	}))();

export const gvlSpecialFeatureSchema = /* @__PURE__ */ (() =>
	v.looseObject({
		description: v.string(),
		descriptionLegal: v.optional(v.string()),
		id: v.number(),
		illustrations: v.array(v.string()),
		name: v.string(),
	}))();

export const gvlVendorUrlSchema = /* @__PURE__ */ (() =>
	v.looseObject({
		langId: v.string(),
		legIntClaim: v.optional(v.string()),
		privacy: v.optional(v.string()),
	}))();

export const gvlVendorSchema = /* @__PURE__ */ (() =>
	v.looseObject({
		cookieMaxAgeSeconds: v.nullable(v.number()),
		cookieRefresh: v.boolean(),
		dataCategories: v.optional(v.array(v.number())),
		dataRetention: v.optional(
			v.looseObject({
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
			v.looseObject({
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
	v.looseObject({
		description: v.string(),
		id: v.number(),
		name: v.string(),
		purposes: v.array(v.number()),
		specialFeatures: v.array(v.number()),
	}))();

export const gvlDataCategorySchema = /* @__PURE__ */ (() =>
	v.looseObject({
		description: v.string(),
		id: v.number(),
		name: v.string(),
	}))();

/**
 * Standard texts the IAB publishes with the vendor list.
 *
 * TCF Policies v5.0.b require CMPs to show `features` alongside the list of
 * Features. The other keys are reserved by `@iabtechlabtcf/core` and may be
 * absent.
 */
export const gvlStandardTextsSchema = /* @__PURE__ */ (() =>
	v.looseObject({
		features: v.string(),
		purposes: v.optional(v.string()),
		specialFeatures: v.optional(v.string()),
		specialPurposes: v.optional(v.string()),
	}))();

export const globalVendorListSchema = /* @__PURE__ */ (() =>
	v.looseObject({
		dataCategories: v.optional(v.record(v.string(), gvlDataCategorySchema)),
		features: v.record(v.string(), gvlFeatureSchema),
		gvlSpecificationVersion: v.number(),
		lastUpdated: v.string(),
		purposes: v.record(v.string(), gvlPurposeSchema),
		specialFeatures: v.record(v.string(), gvlSpecialFeatureSchema),
		specialPurposes: v.record(v.string(), gvlSpecialPurposeSchema),
		stacks: v.record(v.string(), gvlStackSchema),
		/** Standard texts published with the vendor list (TCF 2.4+). */
		standardTexts: v.optional(gvlStandardTextsSchema),
		tcfPolicyVersion: v.number(),
		vendorListVersion: v.number(),
		vendors: v.record(v.string(), gvlVendorSchema),
	}))();

/**
 * Parsed output without the `[key: string]: unknown` index signature that
 * `v.looseObject` adds.
 *
 * Unknown fields still pass through at runtime. The types name only the
 * fields c15t knows, so a misspelt field stays a type error and `in` checks
 * still tell a GVL vendor from a custom vendor. `v.record` index signatures
 * have a concrete value type and are kept.
 */
type KnownFields<Value> = Value extends readonly (infer Item)[]
	? KnownFields<Item>[]
	: Value extends object
		? {
				[
					Key in keyof Value as string extends Key
						? unknown extends Value[Key]
							? never
							: Key
						: Key
				]: KnownFields<Value[Key]>;
			}
		: Value;

type GVLOutput<Schema extends v.GenericSchema> = KnownFields<
	v.InferOutput<Schema>
>;

export type GVLPurpose = GVLOutput<typeof gvlPurposeSchema>;
export type GVLSpecialPurpose = GVLOutput<typeof gvlSpecialPurposeSchema>;
export type GVLFeature = GVLOutput<typeof gvlFeatureSchema>;
export type GVLSpecialFeature = GVLOutput<typeof gvlSpecialFeatureSchema>;
export type GVLVendorUrl = GVLOutput<typeof gvlVendorUrlSchema>;
export type GVLVendor = GVLOutput<typeof gvlVendorSchema>;
export type GVLStack = GVLOutput<typeof gvlStackSchema>;
export type GVLDataCategory = GVLOutput<typeof gvlDataCategorySchema>;
export type GVLStandardTexts = GVLOutput<typeof gvlStandardTextsSchema>;
export type GlobalVendorList = GVLOutput<typeof globalVendorListSchema>;
