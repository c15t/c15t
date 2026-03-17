import * as v from 'valibot';

export const policyTypeSchema = v.picklist([
	// Deprecated in 2.0 RC. Runtime banner behavior should use backend policies.
	'cookie_banner',
	'privacy_policy',
	'dpa',
	'terms_and_conditions',
	'marketing_communications',
	'age_verification',
	'other',
]);

export const consentPolicySchema = v.object({
	id: v.string(),
	version: v.string(),
	type: policyTypeSchema,
	effectiveDate: v.date(),
	isActive: v.optional(v.boolean(), true),
	createdAt: v.optional(v.date(), () => new Date()),
	tenantId: v.nullish(v.string()),
});

export type ConsentPolicy = v.InferOutput<typeof consentPolicySchema>;
export type PolicyType = v.InferOutput<typeof policyTypeSchema>;
