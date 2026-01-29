import * as v from 'valibot';

export const consentStatusSchema = v.picklist([
	'active',
	'withdrawn',
	'expired',
]);

export const consentSchema = v.object({
	id: v.string(),
	subjectId: v.string(),
	domainId: v.string(),
	purposeIds: v.array(v.string()),
	metadata: v.nullish(v.record(v.string(), v.unknown())),
	policyId: v.optional(v.string()),
	ipAddress: v.nullish(v.string()),
	userAgent: v.nullish(v.string()),
	status: v.optional(consentStatusSchema, 'active'),
	withdrawalReason: v.nullish(v.string()),
	givenAt: v.optional(v.date(), () => new Date()),
	validUntil: v.nullish(v.date()),
	isActive: v.optional(v.boolean(), true),
	/** Jurisdiction code (e.g., 'GDPR', 'UK_GDPR', 'CCPA') */
	jurisdiction: v.nullish(v.string()),
	/** Consent model used (e.g., 'opt-in', 'opt-out', 'iab') */
	jurisdictionModel: v.nullish(v.string()),
	/** IAB TCF TC String (only for IAB consents) */
	tcString: v.nullish(v.string()),
});

export type Consent = v.InferOutput<typeof consentSchema>;
export type ConsentStatus = v.InferOutput<typeof consentStatusSchema>;
