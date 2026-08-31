import * as v from 'valibot';

export const consentSchema = v.object({
	/** Derived consent action (e.g., 'accept_all', 'reject_all', 'opt_out', 'custom') */
	consentAction: v.nullish(v.string()),
	domainId: v.string(),
	givenAt: v.optional(v.date(), () => new Date()),
	id: v.string(),
	ipAddress: v.nullish(v.string()),
	/** Jurisdiction code (e.g., 'GDPR', 'UK_GDPR', 'CCPA') */
	jurisdiction: v.nullish(v.string()),
	/** Consent model used (e.g., 'opt-in', 'opt-out', 'iab') */
	jurisdictionModel: v.nullish(v.string()),
	metadata: v.nullish(v.record(v.string(), v.unknown())),
	policyId: v.optional(v.string()),
	purposeIds: v.array(v.string()),
	/** Runtime policy decision reference used for this consent record. */
	runtimePolicyDecisionId: v.nullish(v.string()),
	/** Source of runtime policy decision evidence. */
	runtimePolicySource: v.nullish(
		v.picklist(['snapshot_token', 'write_time_fallback', 'manifest_recompute'])
	),
	subjectId: v.string(),
	/** IAB TCF TC String (only for IAB consents) */
	tcString: v.nullish(v.string()),
	tenantId: v.nullish(v.string()),
	/** Which UI component collected this consent (e.g., 'banner', 'dialog', 'widget') */
	uiSource: v.nullish(v.string()),
	userAgent: v.nullish(v.string()),
	validUntil: v.nullish(v.date()),
});

export type Consent = v.InferOutput<typeof consentSchema>;
