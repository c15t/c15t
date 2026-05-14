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
export declare const nonIABVendorSchema: v.ObjectSchema<
	{
		/**
		 * Unique identifier for the vendor.
		 * Use a slug-like string (e.g., 'internal-analytics', 'live-chat') or a
		 * numeric ID if you already have one.
		 */
		readonly id: v.UnionSchema<
			[
				v.StringSchema<undefined>,
				v.SchemaWithPipe<
					readonly [
						v.NumberSchema<undefined>,
						v.IntegerAction<number, undefined>,
					]
				>,
			],
			undefined
		>;
		/** Display name shown to users */
		readonly name: v.StringSchema<undefined>;
		/** Privacy policy URL (required for transparency) */
		readonly privacyPolicyUrl: v.SchemaWithPipe<
			readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]
		>;
		/** Description of what this vendor does */
		readonly description: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/**
		 * IAB purposes this vendor requires consent for.
		 * Uses standard IAB purpose IDs (1-11) for consistency.
		 */
		readonly purposes: v.ArraySchema<
			v.SchemaWithPipe<
				readonly [
					v.NumberSchema<undefined>,
					v.IntegerAction<number, undefined>,
					v.MinValueAction<number, 1, undefined>,
					v.MaxValueAction<number, 11, undefined>,
				]
			>,
			undefined
		>;
		/**
		 * IAB purposes this vendor claims legitimate interest for.
		 * Users can object to these purposes.
		 */
		readonly legIntPurposes: v.OptionalSchema<
			v.ArraySchema<
				v.SchemaWithPipe<
					readonly [
						v.NumberSchema<undefined>,
						v.IntegerAction<number, undefined>,
						v.MinValueAction<number, 1, undefined>,
						v.MaxValueAction<number, 11, undefined>,
					]
				>,
				undefined
			>,
			undefined
		>;
		/**
		 * Features this vendor uses (IAB feature IDs 1-3).
		 */
		readonly features: v.OptionalSchema<
			v.ArraySchema<
				v.SchemaWithPipe<
					readonly [
						v.NumberSchema<undefined>,
						v.IntegerAction<number, undefined>,
						v.MinValueAction<number, 1, undefined>,
						v.MaxValueAction<number, 3, undefined>,
					]
				>,
				undefined
			>,
			undefined
		>;
		/**
		 * Special features requiring explicit opt-in (IAB special feature IDs 1-2).
		 */
		readonly specialFeatures: v.OptionalSchema<
			v.ArraySchema<
				v.SchemaWithPipe<
					readonly [
						v.NumberSchema<undefined>,
						v.IntegerAction<number, undefined>,
						v.MinValueAction<number, 1, undefined>,
						v.MaxValueAction<number, 2, undefined>,
					]
				>,
				undefined
			>,
			undefined
		>;
		/**
		 * Data categories collected/used (IAB data category IDs 1-11).
		 */
		readonly dataCategories: v.OptionalSchema<
			v.ArraySchema<
				v.SchemaWithPipe<
					readonly [
						v.NumberSchema<undefined>,
						v.IntegerAction<number, undefined>,
						v.MinValueAction<number, 1, undefined>,
						v.MaxValueAction<number, 11, undefined>,
					]
				>,
				undefined
			>,
			undefined
		>;
		/** Maximum cookie/storage duration in seconds */
		readonly cookieMaxAgeSeconds: v.OptionalSchema<
			v.SchemaWithPipe<
				readonly [
					v.NumberSchema<undefined>,
					v.IntegerAction<number, undefined>,
					v.MinValueAction<number, 1, undefined>,
				]
			>,
			undefined
		>;
		/** Whether this vendor uses cookies */
		readonly usesCookies: v.OptionalSchema<
			v.BooleanSchema<undefined>,
			undefined
		>;
		/** Whether this vendor uses non-cookie storage (localStorage, IndexedDB, etc.) */
		readonly usesNonCookieAccess: v.OptionalSchema<
			v.BooleanSchema<undefined>,
			undefined
		>;
		/** How long data is retained (in days) */
		readonly dataRetentionDays: v.OptionalSchema<
			v.SchemaWithPipe<
				readonly [
					v.NumberSchema<undefined>,
					v.IntegerAction<number, undefined>,
					v.MinValueAction<number, 1, undefined>,
				]
			>,
			undefined
		>;
	},
	undefined
>;
/**
 * Schema for consent state of a non-IAB vendor.
 */
export declare const nonIABVendorConsentSchema: v.ObjectSchema<
	{
		/** Vendor ID */
		readonly vendorId: v.UnionSchema<
			[
				v.StringSchema<undefined>,
				v.SchemaWithPipe<
					readonly [
						v.NumberSchema<undefined>,
						v.IntegerAction<number, undefined>,
					]
				>,
			],
			undefined
		>;
		/** Whether the user has consented */
		readonly consented: v.BooleanSchema<undefined>;
		/** Timestamp when consent was given/modified */
		readonly timestamp: v.NumberSchema<undefined>;
	},
	undefined
>;
export type NonIABVendor = v.InferOutput<typeof nonIABVendorSchema>;
export type NonIABVendorConsent = v.InferOutput<
	typeof nonIABVendorConsentSchema
>;
