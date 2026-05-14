import * as v from 'valibot';
export declare const legalDocumentPolicyTypeSchema: v.PicklistSchema<
	['privacy_policy', 'dpa', 'terms_and_conditions'],
	undefined
>;
export declare const policyTypeSchema: v.PicklistSchema<
	[
		'cookie_banner',
		'privacy_policy',
		'dpa',
		'terms_and_conditions',
		'marketing_communications',
		'age_verification',
		'other',
	],
	undefined
>;
export declare const consentPolicySchema: v.ObjectSchema<
	{
		readonly id: v.StringSchema<undefined>;
		readonly version: v.StringSchema<undefined>;
		readonly type: v.PicklistSchema<
			[
				'cookie_banner',
				'privacy_policy',
				'dpa',
				'terms_and_conditions',
				'marketing_communications',
				'age_verification',
				'other',
			],
			undefined
		>;
		readonly hash: v.NullishSchema<v.StringSchema<undefined>, undefined>;
		readonly effectiveDate: v.DateSchema<undefined>;
		readonly isActive: v.OptionalSchema<v.BooleanSchema<undefined>, true>;
		readonly createdAt: v.OptionalSchema<v.DateSchema<undefined>, () => Date>;
		readonly tenantId: v.NullishSchema<v.StringSchema<undefined>, undefined>;
	},
	undefined
>;
export type ConsentPolicy = v.InferOutput<typeof consentPolicySchema>;
export type LegalDocumentPolicyType = v.InferOutput<
	typeof legalDocumentPolicyTypeSchema
>;
export type PolicyType = v.InferOutput<typeof policyTypeSchema>;
