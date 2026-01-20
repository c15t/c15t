import { z } from 'zod';

export const policyTypeSchema = z.enum([
	'cookie_banner',
	'privacy_policy',
	'dpa',
	'terms_and_conditions',
	'marketing_communications',
	'age_verification',
	'other',
]);

export const consentPolicySchema = z.object({
	id: z.string(),
	version: z.string(),
	type: policyTypeSchema,
	name: z.string(),
	effectiveDate: z.date(),
	expirationDate: z.date().nullish(),
	content: z.string(),
	contentHash: z.string(),
	isActive: z.boolean().prefault(true),
	createdAt: z.date().prefault(() => new Date()),
});

export type ConsentPolicy = z.infer<typeof consentPolicySchema>;
export type PolicyType = z.infer<typeof policyTypeSchema>;
