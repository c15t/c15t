/**
 * IAB TCF Global Vendor List (GVL) schemas and types.
 *
 * Based on IAB TCF v2.3 specification.
 * @see https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework
 */
import * as v from 'valibot';
export declare const gvlPurposeSchema: v.ObjectSchema<
	{
		readonly id: v.NumberSchema<undefined>;
		readonly name: v.StringSchema<undefined>;
		readonly description: v.StringSchema<undefined>;
		readonly illustrations: v.ArraySchema<v.StringSchema<undefined>, undefined>;
		readonly descriptionLegal: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
	},
	undefined
>;
export declare const gvlSpecialPurposeSchema: v.ObjectSchema<
	{
		readonly id: v.NumberSchema<undefined>;
		readonly name: v.StringSchema<undefined>;
		readonly description: v.StringSchema<undefined>;
		readonly illustrations: v.ArraySchema<v.StringSchema<undefined>, undefined>;
		readonly descriptionLegal: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
	},
	undefined
>;
export declare const gvlFeatureSchema: v.ObjectSchema<
	{
		readonly id: v.NumberSchema<undefined>;
		readonly name: v.StringSchema<undefined>;
		readonly description: v.StringSchema<undefined>;
		readonly illustrations: v.ArraySchema<v.StringSchema<undefined>, undefined>;
		readonly descriptionLegal: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
	},
	undefined
>;
export declare const gvlSpecialFeatureSchema: v.ObjectSchema<
	{
		readonly id: v.NumberSchema<undefined>;
		readonly name: v.StringSchema<undefined>;
		readonly description: v.StringSchema<undefined>;
		readonly illustrations: v.ArraySchema<v.StringSchema<undefined>, undefined>;
		readonly descriptionLegal: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
	},
	undefined
>;
export declare const gvlVendorUrlSchema: v.ObjectSchema<
	{
		readonly langId: v.StringSchema<undefined>;
		readonly privacy: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		readonly legIntClaim: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
	},
	undefined
>;
export declare const gvlVendorSchema: v.ObjectSchema<
	{
		readonly id: v.NumberSchema<undefined>;
		readonly name: v.StringSchema<undefined>;
		readonly purposes: v.ArraySchema<v.NumberSchema<undefined>, undefined>;
		readonly legIntPurposes: v.ArraySchema<
			v.NumberSchema<undefined>,
			undefined
		>;
		readonly flexiblePurposes: v.ArraySchema<
			v.NumberSchema<undefined>,
			undefined
		>;
		readonly specialPurposes: v.ArraySchema<
			v.NumberSchema<undefined>,
			undefined
		>;
		readonly features: v.ArraySchema<v.NumberSchema<undefined>, undefined>;
		readonly specialFeatures: v.ArraySchema<
			v.NumberSchema<undefined>,
			undefined
		>;
		readonly cookieMaxAgeSeconds: v.NullableSchema<
			v.NumberSchema<undefined>,
			undefined
		>;
		readonly usesCookies: v.BooleanSchema<undefined>;
		readonly cookieRefresh: v.BooleanSchema<undefined>;
		readonly usesNonCookieAccess: v.BooleanSchema<undefined>;
		readonly urls: v.ArraySchema<
			v.ObjectSchema<
				{
					readonly langId: v.StringSchema<undefined>;
					readonly privacy: v.OptionalSchema<
						v.StringSchema<undefined>,
						undefined
					>;
					readonly legIntClaim: v.OptionalSchema<
						v.StringSchema<undefined>,
						undefined
					>;
				},
				undefined
			>,
			undefined
		>;
		readonly deviceStorageDisclosureUrl: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		readonly dataCategories: v.OptionalSchema<
			v.ArraySchema<v.NumberSchema<undefined>, undefined>,
			undefined
		>;
		readonly dataRetention: v.OptionalSchema<
			v.ObjectSchema<
				{
					readonly purposes: v.OptionalSchema<
						v.RecordSchema<
							v.StringSchema<undefined>,
							v.NumberSchema<undefined>,
							undefined
						>,
						undefined
					>;
					readonly specialPurposes: v.OptionalSchema<
						v.RecordSchema<
							v.StringSchema<undefined>,
							v.NumberSchema<undefined>,
							undefined
						>,
						undefined
					>;
					readonly stdRetention: v.OptionalSchema<
						v.NumberSchema<undefined>,
						undefined
					>;
				},
				undefined
			>,
			undefined
		>;
		readonly deletedDate: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		readonly overflow: v.OptionalSchema<
			v.ObjectSchema<
				{
					readonly httpGetLimit: v.NumberSchema<undefined>;
				},
				undefined
			>,
			undefined
		>;
	},
	undefined
>;
export declare const gvlStackSchema: v.ObjectSchema<
	{
		readonly id: v.NumberSchema<undefined>;
		readonly name: v.StringSchema<undefined>;
		readonly description: v.StringSchema<undefined>;
		readonly purposes: v.ArraySchema<v.NumberSchema<undefined>, undefined>;
		readonly specialFeatures: v.ArraySchema<
			v.NumberSchema<undefined>,
			undefined
		>;
	},
	undefined
>;
export declare const gvlDataCategorySchema: v.ObjectSchema<
	{
		readonly id: v.NumberSchema<undefined>;
		readonly name: v.StringSchema<undefined>;
		readonly description: v.StringSchema<undefined>;
	},
	undefined
>;
export declare const globalVendorListSchema: v.ObjectSchema<
	{
		readonly gvlSpecificationVersion: v.NumberSchema<undefined>;
		readonly vendorListVersion: v.NumberSchema<undefined>;
		readonly tcfPolicyVersion: v.NumberSchema<undefined>;
		readonly lastUpdated: v.StringSchema<undefined>;
		readonly purposes: v.RecordSchema<
			v.StringSchema<undefined>,
			v.ObjectSchema<
				{
					readonly id: v.NumberSchema<undefined>;
					readonly name: v.StringSchema<undefined>;
					readonly description: v.StringSchema<undefined>;
					readonly illustrations: v.ArraySchema<
						v.StringSchema<undefined>,
						undefined
					>;
					readonly descriptionLegal: v.OptionalSchema<
						v.StringSchema<undefined>,
						undefined
					>;
				},
				undefined
			>,
			undefined
		>;
		readonly specialPurposes: v.RecordSchema<
			v.StringSchema<undefined>,
			v.ObjectSchema<
				{
					readonly id: v.NumberSchema<undefined>;
					readonly name: v.StringSchema<undefined>;
					readonly description: v.StringSchema<undefined>;
					readonly illustrations: v.ArraySchema<
						v.StringSchema<undefined>,
						undefined
					>;
					readonly descriptionLegal: v.OptionalSchema<
						v.StringSchema<undefined>,
						undefined
					>;
				},
				undefined
			>,
			undefined
		>;
		readonly features: v.RecordSchema<
			v.StringSchema<undefined>,
			v.ObjectSchema<
				{
					readonly id: v.NumberSchema<undefined>;
					readonly name: v.StringSchema<undefined>;
					readonly description: v.StringSchema<undefined>;
					readonly illustrations: v.ArraySchema<
						v.StringSchema<undefined>,
						undefined
					>;
					readonly descriptionLegal: v.OptionalSchema<
						v.StringSchema<undefined>,
						undefined
					>;
				},
				undefined
			>,
			undefined
		>;
		readonly specialFeatures: v.RecordSchema<
			v.StringSchema<undefined>,
			v.ObjectSchema<
				{
					readonly id: v.NumberSchema<undefined>;
					readonly name: v.StringSchema<undefined>;
					readonly description: v.StringSchema<undefined>;
					readonly illustrations: v.ArraySchema<
						v.StringSchema<undefined>,
						undefined
					>;
					readonly descriptionLegal: v.OptionalSchema<
						v.StringSchema<undefined>,
						undefined
					>;
				},
				undefined
			>,
			undefined
		>;
		readonly vendors: v.RecordSchema<
			v.StringSchema<undefined>,
			v.ObjectSchema<
				{
					readonly id: v.NumberSchema<undefined>;
					readonly name: v.StringSchema<undefined>;
					readonly purposes: v.ArraySchema<
						v.NumberSchema<undefined>,
						undefined
					>;
					readonly legIntPurposes: v.ArraySchema<
						v.NumberSchema<undefined>,
						undefined
					>;
					readonly flexiblePurposes: v.ArraySchema<
						v.NumberSchema<undefined>,
						undefined
					>;
					readonly specialPurposes: v.ArraySchema<
						v.NumberSchema<undefined>,
						undefined
					>;
					readonly features: v.ArraySchema<
						v.NumberSchema<undefined>,
						undefined
					>;
					readonly specialFeatures: v.ArraySchema<
						v.NumberSchema<undefined>,
						undefined
					>;
					readonly cookieMaxAgeSeconds: v.NullableSchema<
						v.NumberSchema<undefined>,
						undefined
					>;
					readonly usesCookies: v.BooleanSchema<undefined>;
					readonly cookieRefresh: v.BooleanSchema<undefined>;
					readonly usesNonCookieAccess: v.BooleanSchema<undefined>;
					readonly urls: v.ArraySchema<
						v.ObjectSchema<
							{
								readonly langId: v.StringSchema<undefined>;
								readonly privacy: v.OptionalSchema<
									v.StringSchema<undefined>,
									undefined
								>;
								readonly legIntClaim: v.OptionalSchema<
									v.StringSchema<undefined>,
									undefined
								>;
							},
							undefined
						>,
						undefined
					>;
					readonly deviceStorageDisclosureUrl: v.OptionalSchema<
						v.StringSchema<undefined>,
						undefined
					>;
					readonly dataCategories: v.OptionalSchema<
						v.ArraySchema<v.NumberSchema<undefined>, undefined>,
						undefined
					>;
					readonly dataRetention: v.OptionalSchema<
						v.ObjectSchema<
							{
								readonly purposes: v.OptionalSchema<
									v.RecordSchema<
										v.StringSchema<undefined>,
										v.NumberSchema<undefined>,
										undefined
									>,
									undefined
								>;
								readonly specialPurposes: v.OptionalSchema<
									v.RecordSchema<
										v.StringSchema<undefined>,
										v.NumberSchema<undefined>,
										undefined
									>,
									undefined
								>;
								readonly stdRetention: v.OptionalSchema<
									v.NumberSchema<undefined>,
									undefined
								>;
							},
							undefined
						>,
						undefined
					>;
					readonly deletedDate: v.OptionalSchema<
						v.StringSchema<undefined>,
						undefined
					>;
					readonly overflow: v.OptionalSchema<
						v.ObjectSchema<
							{
								readonly httpGetLimit: v.NumberSchema<undefined>;
							},
							undefined
						>,
						undefined
					>;
				},
				undefined
			>,
			undefined
		>;
		readonly stacks: v.RecordSchema<
			v.StringSchema<undefined>,
			v.ObjectSchema<
				{
					readonly id: v.NumberSchema<undefined>;
					readonly name: v.StringSchema<undefined>;
					readonly description: v.StringSchema<undefined>;
					readonly purposes: v.ArraySchema<
						v.NumberSchema<undefined>,
						undefined
					>;
					readonly specialFeatures: v.ArraySchema<
						v.NumberSchema<undefined>,
						undefined
					>;
				},
				undefined
			>,
			undefined
		>;
		readonly dataCategories: v.OptionalSchema<
			v.RecordSchema<
				v.StringSchema<undefined>,
				v.ObjectSchema<
					{
						readonly id: v.NumberSchema<undefined>;
						readonly name: v.StringSchema<undefined>;
						readonly description: v.StringSchema<undefined>;
					},
					undefined
				>,
				undefined
			>,
			undefined
		>;
	},
	undefined
>;
export type GVLPurpose = v.InferOutput<typeof gvlPurposeSchema>;
export type GVLSpecialPurpose = v.InferOutput<typeof gvlSpecialPurposeSchema>;
export type GVLFeature = v.InferOutput<typeof gvlFeatureSchema>;
export type GVLSpecialFeature = v.InferOutput<typeof gvlSpecialFeatureSchema>;
export type GVLVendorUrl = v.InferOutput<typeof gvlVendorUrlSchema>;
export type GVLVendor = v.InferOutput<typeof gvlVendorSchema>;
export type GVLStack = v.InferOutput<typeof gvlStackSchema>;
export type GVLDataCategory = v.InferOutput<typeof gvlDataCategorySchema>;
export type GlobalVendorList = v.InferOutput<typeof globalVendorListSchema>;
