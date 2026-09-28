/**
 * Vendor declarations for vendor-level consent outside IAB TCF.
 *
 * A vendor is a named third party whose scripts, requests or iframes a
 * publisher gates. Each vendor sits inside one or more consent categories;
 * a subject can grant the category and still turn one vendor off. This is
 * deliberately separate from {@link nonIABVendorSchema}, which speaks the
 * TCF vocabulary (numeric purposes, features, data categories) and only
 * matters when the policy model is `iab`.
 *
 * @packageDocumentation
 */

import * as v from 'valibot';

import { POLICY_CONSENT_CATEGORIES } from './policy-rule';
import type { PolicyConsentCategory } from './policy-rule';

/**
 * Category condition a vendor sits under. Mirrors the core `HasCondition`
 * shape so a vendor declared on the backend can carry the same `and`,
 * `or` and `not` trees a script declares in code.
 */
export type VendorCategoryCondition =
	| PolicyConsentCategory
	| { and: VendorCategoryCondition | VendorCategoryCondition[] }
	| { or: VendorCategoryCondition | VendorCategoryCondition[] }
	| { not: VendorCategoryCondition };

const categoryNameSchema = v.picklist(POLICY_CONSENT_CATEGORIES);

/** Recursive schema for {@link VendorCategoryCondition}. */
export const vendorCategoryConditionSchema: v.GenericSchema<VendorCategoryCondition> =
	v.lazy(() =>
		v.union([
			categoryNameSchema,
			v.strictObject({
				and: v.union([
					vendorCategoryConditionSchema,
					v.pipe(v.array(vendorCategoryConditionSchema), v.minLength(1)),
				]),
			}),
			v.strictObject({
				or: v.union([
					vendorCategoryConditionSchema,
					v.pipe(v.array(vendorCategoryConditionSchema), v.minLength(1)),
				]),
			}),
			v.strictObject({ not: vendorCategoryConditionSchema }),
		])
	);

/**
 * Stable vendor identifier. Lowercase slug so it survives cookies, URLs and
 * `data-vendor` attributes without escaping.
 */
export const vendorIdSchema = v.pipe(
	v.string(),
	v.regex(
		/^[a-z0-9][a-z0-9._-]{0,63}$/u,
		'Vendor id must be a lowercase slug of up to 64 characters.'
	),
	v.description('Stable vendor slug used by scripts, rules and iframes.'),
	v.examples(['meta-pixel', 'google-analytics'])
);

/**
 * A vendor a publisher declares so the preference surface can list it and
 * gates can honor a per-vendor denial.
 */
export const vendorSchema = v.object({
	/** Category condition the vendor's processing falls under. */
	category: vendorCategoryConditionSchema,
	/** What the vendor does with the data. */
	description: v.optional(v.string()),
	/**
	 * Present the vendor without a toggle. Used when the resolved category
	 * is `necessary` only, or when the publisher wants a listing that the
	 * subject cannot switch off.
	 */
	disabled: v.optional(v.boolean()),
	/** Vendor homepage. */
	homepageUrl: v.optional(v.pipe(v.string(), v.url())),
	id: vendorIdSchema,
	/** Registered legal entity, when it differs from the display name. */
	legalName: v.optional(v.string()),
	/** Display name shown to subjects. */
	name: v.string(),
	/** Privacy policy URL shown next to the vendor. */
	privacyPolicyUrl: v.pipe(v.string(), v.url()),
});

export type Vendor = v.InferOutput<typeof vendorSchema>;
