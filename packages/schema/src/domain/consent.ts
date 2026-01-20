import { z } from 'zod';

export const consentStatusSchema = z.enum(['active', 'withdrawn', 'expired']);

export const consentSchema = z.object({
	id: z.string(),
	subjectId: z.string(),
	domainId: z.string(),
	purposeIds: z.array(z.string()),
	metadata: z.record(z.string(), z.unknown()).nullish(),
	policyId: z.string().optional(),
	ipAddress: z.string().nullish(),
	userAgent: z.string().nullish(),
	status: consentStatusSchema.prefault('active'),
	withdrawalReason: z.string().nullish(),
	givenAt: z.date().prefault(() => new Date()),
	validUntil: z.date().nullish(),
	isActive: z.boolean().prefault(true),
});

export type Consent = z.infer<typeof consentSchema>;
export type ConsentStatus = z.infer<typeof consentStatusSchema>;
