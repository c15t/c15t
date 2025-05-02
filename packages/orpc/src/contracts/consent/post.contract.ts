import { oc } from '@orpc/contract';
import { z } from 'zod';
import { PolicyTypeSchema } from '../shared/policy-type.schema';

const baseConsentSchema = z.object({
	subjectId: z.string().optional(),
	externalSubjectId: z.string().optional(),
	domain: z.string(),
	type: PolicyTypeSchema,
	metadata: z.record(z.unknown()).optional(),
});

// Cookie banner needs preferences
const cookieBannerSchema = baseConsentSchema.extend({
	type: z.literal('cookie_banner'),
	preferences: z.record(z.boolean()),
});

// Policy based consent just needs the policy ID
const policyBasedSchema = baseConsentSchema.extend({
	type: z.enum(['privacy_policy', 'dpa', 'terms_and_conditions']),
	policyId: z.string().optional(),
	preferences: z.record(z.boolean()).optional(),
});

// Other consent types just need the base fields
const otherConsentSchema = baseConsentSchema.extend({
	type: z.enum(['marketing_communications', 'age_verification', 'other']),
	preferences: z.record(z.boolean()).optional(),
});

export const postConsentContract = oc
	.input(
		z.discriminatedUnion('type', [
			cookieBannerSchema,
			policyBasedSchema,
			otherConsentSchema,
		])
	)
	.output(
		z.object({
			id: z.string(),
			subjectId: z.string().optional(),
			externalSubjectId: z.string().optional(),
			domainId: z.string(),
			domain: z.string(),
			type: PolicyTypeSchema,
			status: z.string(),
			recordId: z.string(),
			metadata: z.record(z.unknown()).optional(),
			givenAt: z.string(),
		})
	);
