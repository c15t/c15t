import * as v from 'valibot';
export declare const consentSchema: v.ObjectSchema<
	{
		readonly id: v.StringSchema<undefined>;
		readonly subjectId: v.StringSchema<undefined>;
		readonly domainId: v.StringSchema<undefined>;
		readonly purposeIds: v.ArraySchema<v.StringSchema<undefined>, undefined>;
		readonly metadata: v.NullishSchema<
			v.RecordSchema<v.StringSchema<undefined>, v.UnknownSchema, undefined>,
			undefined
		>;
		readonly policyId: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		readonly ipAddress: v.NullishSchema<v.StringSchema<undefined>, undefined>;
		readonly userAgent: v.NullishSchema<v.StringSchema<undefined>, undefined>;
		readonly givenAt: v.OptionalSchema<v.DateSchema<undefined>, () => Date>;
		readonly validUntil: v.NullishSchema<v.DateSchema<undefined>, undefined>;
		/** Jurisdiction code (e.g., 'GDPR', 'UK_GDPR', 'CCPA') */
		readonly jurisdiction: v.NullishSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** Consent model used (e.g., 'opt-in', 'opt-out', 'iab') */
		readonly jurisdictionModel: v.NullishSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** IAB TCF TC String (only for IAB consents) */
		readonly tcString: v.NullishSchema<v.StringSchema<undefined>, undefined>;
		/** Which UI component collected this consent (e.g., 'banner', 'dialog', 'widget') */
		readonly uiSource: v.NullishSchema<v.StringSchema<undefined>, undefined>;
		/** Derived consent action (e.g., 'accept_all', 'reject_all', 'opt_out', 'custom') */
		readonly consentAction: v.NullishSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** Runtime policy decision reference used for this consent record. */
		readonly runtimePolicyDecisionId: v.NullishSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** Source of runtime policy decision evidence. */
		readonly runtimePolicySource: v.NullishSchema<
			v.PicklistSchema<['snapshot_token', 'write_time_fallback'], undefined>,
			undefined
		>;
		readonly tenantId: v.NullishSchema<v.StringSchema<undefined>, undefined>;
	},
	undefined
>;
export type Consent = v.InferOutput<typeof consentSchema>;
