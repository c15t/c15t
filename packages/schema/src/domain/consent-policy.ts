import * as v from 'valibot';

export const policyTypeSchema = v.picklist([
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
	name: v.string(),
	effectiveDate: v.date(),
	expirationDate: v.nullish(v.date()),
	content: v.string(),
	contentHash: v.string(),
	isActive: v.optional(v.boolean(), true),
	createdAt: v.optional(v.date(), () => new Date()),
});

export type ConsentPolicy = v.InferOutput<typeof consentPolicySchema>;
export type PolicyType = v.InferOutput<typeof policyTypeSchema>;
