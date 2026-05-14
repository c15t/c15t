/**
 * GET /consent/check schemas - Pre-banner cross-device consent check.
 *
 * @packageDocumentation
 */
import * as v from 'valibot';
/**
 * Query params for consent check
 */
export declare const checkConsentQuerySchema: v.ObjectSchema<
	{
		/** External user ID to check */
		readonly externalId: v.StringSchema<undefined>;
		/** Consent type(s) to check, comma-separated */
		readonly type: v.StringSchema<undefined>;
	},
	undefined
>;
/**
 * Result for a single consent type
 */
export declare const consentCheckResultSchema: v.ObjectSchema<
	{
		/** Whether consent has been given for this type */
		readonly hasConsent: v.BooleanSchema<undefined>;
		/** Whether the consent is for the latest policy version */
		readonly isLatestPolicy: v.BooleanSchema<undefined>;
	},
	undefined
>;
/**
 * Output schema for consent check
 */
export declare const checkConsentOutputSchema: v.ObjectSchema<
	{
		/** Results keyed by consent type */
		readonly results: v.RecordSchema<
			v.StringSchema<undefined>,
			v.ObjectSchema<
				{
					/** Whether consent has been given for this type */
					readonly hasConsent: v.BooleanSchema<undefined>;
					/** Whether the consent is for the latest policy version */
					readonly isLatestPolicy: v.BooleanSchema<undefined>;
				},
				undefined
			>,
			undefined
		>;
	},
	undefined
>;
/**
 * Error schemas for consent check
 */
export declare const checkConsentErrorSchemas: {
	inputValidationFailed: v.ObjectSchema<
		{
			readonly formErrors: v.ArraySchema<v.StringSchema<undefined>, undefined>;
			readonly fieldErrors: v.RecordSchema<
				v.StringSchema<undefined>,
				v.ArraySchema<v.StringSchema<undefined>, undefined>,
				undefined
			>;
		},
		undefined
	>;
	externalIdRequired: v.ObjectSchema<
		{
			readonly message: v.StringSchema<undefined>;
		},
		undefined
	>;
	typeRequired: v.ObjectSchema<
		{
			readonly message: v.StringSchema<undefined>;
		},
		undefined
	>;
};
export type CheckConsentQuery = v.InferOutput<typeof checkConsentQuerySchema>;
export type CheckConsentOutput = v.InferOutput<typeof checkConsentOutputSchema>;
export type ConsentCheckResult = v.InferOutput<typeof consentCheckResultSchema>;
