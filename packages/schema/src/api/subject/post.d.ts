/**
 * POST /subject schemas - Records consent (append-only).
 *
 * @packageDocumentation
 */
import * as v from 'valibot';
/**
 * Base subject ID validation - must be in sub_xxx format
 */
export declare const subjectIdSchema: v.SchemaWithPipe<
	readonly [
		v.StringSchema<undefined>,
		v.RegexAction<string, 'Invalid subject ID format'>,
	]
>;
/**
 * Cookie banner consent - requires preferences
 */
export declare const subjectCookieBannerInputSchema: v.ObjectSchema<
	{
		readonly type: v.LiteralSchema<'cookie_banner', undefined>;
		readonly preferences: v.RecordSchema<
			v.StringSchema<undefined>,
			v.BooleanSchema<undefined>,
			undefined
		>;
		/** Client-generated subject ID in sub_xxx format (required) */
		readonly subjectId: v.SchemaWithPipe<
			readonly [
				v.StringSchema<undefined>,
				v.RegexAction<string, 'Invalid subject ID format'>,
			]
		>;
		/** External subject ID from your auth system (optional) */
		readonly externalSubjectId: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** Identity provider name (optional) */
		readonly identityProvider: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** Domain where consent was given */
		readonly domain: v.StringSchema<undefined>;
		/** Additional metadata */
		readonly metadata: v.OptionalSchema<
			v.RecordSchema<v.StringSchema<undefined>, v.UnknownSchema, undefined>,
			undefined
		>;
		/** When the consent was given in epoch milliseconds */
		readonly givenAt: v.NumberSchema<undefined>;
		/** Jurisdiction code (e.g., 'GDPR', 'UK_GDPR', 'CCPA') */
		readonly jurisdiction: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** Consent model used (e.g., 'opt-in', 'opt-out', 'iab') */
		readonly jurisdictionModel: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** IAB TCF TC String (only for IAB consents) */
		readonly tcString: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		/** Which UI component collected this consent (e.g., 'banner', 'dialog', 'widget') */
		readonly uiSource: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		/** Consent action type (e.g., 'all', 'necessary', 'custom') */
		readonly consentAction: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** Signed policy snapshot token from /init for consistency/auditability */
		readonly policySnapshotToken: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** Signed legal-document snapshot token from a rendered document view */
		readonly documentSnapshotToken: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
	},
	undefined
>;
/**
 * Policy-based consent
 *
 * For legal documents, callers should prefer `documentSnapshotToken` when
 * available. `policyHash` is intended as a lighter-weight fallback when the
 * client knows the rendered release hash but not the internal c15t policy ID.
 */
export declare const subjectPolicyBasedInputSchema: v.ObjectSchema<
	{
		readonly type: v.PicklistSchema<
			['privacy_policy', 'dpa', 'terms_and_conditions'],
			undefined
		>;
		readonly policyId: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		readonly policyHash: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		readonly preferences: v.OptionalSchema<
			v.RecordSchema<
				v.StringSchema<undefined>,
				v.BooleanSchema<undefined>,
				undefined
			>,
			undefined
		>;
		/** Client-generated subject ID in sub_xxx format (required) */
		readonly subjectId: v.SchemaWithPipe<
			readonly [
				v.StringSchema<undefined>,
				v.RegexAction<string, 'Invalid subject ID format'>,
			]
		>;
		/** External subject ID from your auth system (optional) */
		readonly externalSubjectId: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** Identity provider name (optional) */
		readonly identityProvider: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** Domain where consent was given */
		readonly domain: v.StringSchema<undefined>;
		/** Additional metadata */
		readonly metadata: v.OptionalSchema<
			v.RecordSchema<v.StringSchema<undefined>, v.UnknownSchema, undefined>,
			undefined
		>;
		/** When the consent was given in epoch milliseconds */
		readonly givenAt: v.NumberSchema<undefined>;
		/** Jurisdiction code (e.g., 'GDPR', 'UK_GDPR', 'CCPA') */
		readonly jurisdiction: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** Consent model used (e.g., 'opt-in', 'opt-out', 'iab') */
		readonly jurisdictionModel: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** IAB TCF TC String (only for IAB consents) */
		readonly tcString: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		/** Which UI component collected this consent (e.g., 'banner', 'dialog', 'widget') */
		readonly uiSource: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		/** Consent action type (e.g., 'all', 'necessary', 'custom') */
		readonly consentAction: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** Signed policy snapshot token from /init for consistency/auditability */
		readonly policySnapshotToken: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** Signed legal-document snapshot token from a rendered document view */
		readonly documentSnapshotToken: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
	},
	undefined
>;
/**
 * Other consent types
 */
export declare const subjectOtherConsentInputSchema: v.ObjectSchema<
	{
		readonly type: v.PicklistSchema<
			['marketing_communications', 'age_verification', 'other'],
			undefined
		>;
		readonly preferences: v.OptionalSchema<
			v.RecordSchema<
				v.StringSchema<undefined>,
				v.BooleanSchema<undefined>,
				undefined
			>,
			undefined
		>;
		/** Client-generated subject ID in sub_xxx format (required) */
		readonly subjectId: v.SchemaWithPipe<
			readonly [
				v.StringSchema<undefined>,
				v.RegexAction<string, 'Invalid subject ID format'>,
			]
		>;
		/** External subject ID from your auth system (optional) */
		readonly externalSubjectId: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** Identity provider name (optional) */
		readonly identityProvider: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** Domain where consent was given */
		readonly domain: v.StringSchema<undefined>;
		/** Additional metadata */
		readonly metadata: v.OptionalSchema<
			v.RecordSchema<v.StringSchema<undefined>, v.UnknownSchema, undefined>,
			undefined
		>;
		/** When the consent was given in epoch milliseconds */
		readonly givenAt: v.NumberSchema<undefined>;
		/** Jurisdiction code (e.g., 'GDPR', 'UK_GDPR', 'CCPA') */
		readonly jurisdiction: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** Consent model used (e.g., 'opt-in', 'opt-out', 'iab') */
		readonly jurisdictionModel: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** IAB TCF TC String (only for IAB consents) */
		readonly tcString: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		/** Which UI component collected this consent (e.g., 'banner', 'dialog', 'widget') */
		readonly uiSource: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		/** Consent action type (e.g., 'all', 'necessary', 'custom') */
		readonly consentAction: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** Signed policy snapshot token from /init for consistency/auditability */
		readonly policySnapshotToken: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		/** Signed legal-document snapshot token from a rendered document view */
		readonly documentSnapshotToken: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
	},
	undefined
>;
/**
 * POST /subject input schema - variant (discriminated union)
 */
export declare const postSubjectInputSchema: v.VariantSchema<
	'type',
	[
		v.ObjectSchema<
			{
				readonly type: v.LiteralSchema<'cookie_banner', undefined>;
				readonly preferences: v.RecordSchema<
					v.StringSchema<undefined>,
					v.BooleanSchema<undefined>,
					undefined
				>;
				/** Client-generated subject ID in sub_xxx format (required) */
				readonly subjectId: v.SchemaWithPipe<
					readonly [
						v.StringSchema<undefined>,
						v.RegexAction<string, 'Invalid subject ID format'>,
					]
				>;
				/** External subject ID from your auth system (optional) */
				readonly externalSubjectId: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Identity provider name (optional) */
				readonly identityProvider: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Domain where consent was given */
				readonly domain: v.StringSchema<undefined>;
				/** Additional metadata */
				readonly metadata: v.OptionalSchema<
					v.RecordSchema<v.StringSchema<undefined>, v.UnknownSchema, undefined>,
					undefined
				>;
				/** When the consent was given in epoch milliseconds */
				readonly givenAt: v.NumberSchema<undefined>;
				/** Jurisdiction code (e.g., 'GDPR', 'UK_GDPR', 'CCPA') */
				readonly jurisdiction: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Consent model used (e.g., 'opt-in', 'opt-out', 'iab') */
				readonly jurisdictionModel: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** IAB TCF TC String (only for IAB consents) */
				readonly tcString: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Which UI component collected this consent (e.g., 'banner', 'dialog', 'widget') */
				readonly uiSource: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Consent action type (e.g., 'all', 'necessary', 'custom') */
				readonly consentAction: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Signed policy snapshot token from /init for consistency/auditability */
				readonly policySnapshotToken: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Signed legal-document snapshot token from a rendered document view */
				readonly documentSnapshotToken: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
			},
			undefined
		>,
		v.ObjectSchema<
			{
				readonly type: v.PicklistSchema<
					['privacy_policy', 'dpa', 'terms_and_conditions'],
					undefined
				>;
				readonly policyId: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				readonly policyHash: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				readonly preferences: v.OptionalSchema<
					v.RecordSchema<
						v.StringSchema<undefined>,
						v.BooleanSchema<undefined>,
						undefined
					>,
					undefined
				>;
				/** Client-generated subject ID in sub_xxx format (required) */
				readonly subjectId: v.SchemaWithPipe<
					readonly [
						v.StringSchema<undefined>,
						v.RegexAction<string, 'Invalid subject ID format'>,
					]
				>;
				/** External subject ID from your auth system (optional) */
				readonly externalSubjectId: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Identity provider name (optional) */
				readonly identityProvider: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Domain where consent was given */
				readonly domain: v.StringSchema<undefined>;
				/** Additional metadata */
				readonly metadata: v.OptionalSchema<
					v.RecordSchema<v.StringSchema<undefined>, v.UnknownSchema, undefined>,
					undefined
				>;
				/** When the consent was given in epoch milliseconds */
				readonly givenAt: v.NumberSchema<undefined>;
				/** Jurisdiction code (e.g., 'GDPR', 'UK_GDPR', 'CCPA') */
				readonly jurisdiction: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Consent model used (e.g., 'opt-in', 'opt-out', 'iab') */
				readonly jurisdictionModel: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** IAB TCF TC String (only for IAB consents) */
				readonly tcString: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Which UI component collected this consent (e.g., 'banner', 'dialog', 'widget') */
				readonly uiSource: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Consent action type (e.g., 'all', 'necessary', 'custom') */
				readonly consentAction: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Signed policy snapshot token from /init for consistency/auditability */
				readonly policySnapshotToken: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Signed legal-document snapshot token from a rendered document view */
				readonly documentSnapshotToken: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
			},
			undefined
		>,
		v.ObjectSchema<
			{
				readonly type: v.PicklistSchema<
					['marketing_communications', 'age_verification', 'other'],
					undefined
				>;
				readonly preferences: v.OptionalSchema<
					v.RecordSchema<
						v.StringSchema<undefined>,
						v.BooleanSchema<undefined>,
						undefined
					>,
					undefined
				>;
				/** Client-generated subject ID in sub_xxx format (required) */
				readonly subjectId: v.SchemaWithPipe<
					readonly [
						v.StringSchema<undefined>,
						v.RegexAction<string, 'Invalid subject ID format'>,
					]
				>;
				/** External subject ID from your auth system (optional) */
				readonly externalSubjectId: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Identity provider name (optional) */
				readonly identityProvider: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Domain where consent was given */
				readonly domain: v.StringSchema<undefined>;
				/** Additional metadata */
				readonly metadata: v.OptionalSchema<
					v.RecordSchema<v.StringSchema<undefined>, v.UnknownSchema, undefined>,
					undefined
				>;
				/** When the consent was given in epoch milliseconds */
				readonly givenAt: v.NumberSchema<undefined>;
				/** Jurisdiction code (e.g., 'GDPR', 'UK_GDPR', 'CCPA') */
				readonly jurisdiction: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Consent model used (e.g., 'opt-in', 'opt-out', 'iab') */
				readonly jurisdictionModel: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** IAB TCF TC String (only for IAB consents) */
				readonly tcString: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Which UI component collected this consent (e.g., 'banner', 'dialog', 'widget') */
				readonly uiSource: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Consent action type (e.g., 'all', 'necessary', 'custom') */
				readonly consentAction: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Signed policy snapshot token from /init for consistency/auditability */
				readonly policySnapshotToken: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				/** Signed legal-document snapshot token from a rendered document view */
				readonly documentSnapshotToken: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
			},
			undefined
		>,
	],
	undefined
>;
/**
 * POST /subject output schema
 */
export declare const postSubjectOutputSchema: v.ObjectSchema<
	{
		readonly subjectId: v.StringSchema<undefined>;
		readonly consentId: v.StringSchema<undefined>;
		readonly domainId: v.StringSchema<undefined>;
		readonly domain: v.StringSchema<undefined>;
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
		readonly metadata: v.OptionalSchema<
			v.RecordSchema<v.StringSchema<undefined>, v.UnknownSchema, undefined>,
			undefined
		>;
		readonly appliedPreferences: v.OptionalSchema<
			v.RecordSchema<
				v.StringSchema<undefined>,
				v.BooleanSchema<undefined>,
				undefined
			>,
			undefined
		>;
		readonly uiSource: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		readonly givenAt: v.DateSchema<undefined>;
	},
	undefined
>;
/**
 * Error schemas for POST /subject
 */
export declare const postSubjectErrorSchemas: {
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
	subjectCreationFailed: v.ObjectSchema<
		{
			readonly subjectId: v.StringSchema<undefined>;
		},
		undefined
	>;
	domainCreationFailed: v.ObjectSchema<
		{
			readonly domain: v.StringSchema<undefined>;
		},
		undefined
	>;
	policyNotFound: v.ObjectSchema<
		{
			readonly policyId: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
			readonly type: v.StringSchema<undefined>;
		},
		undefined
	>;
	policyInactive: v.ObjectSchema<
		{
			readonly policyId: v.StringSchema<undefined>;
			readonly type: v.StringSchema<undefined>;
		},
		undefined
	>;
	policyCreationFailed: v.ObjectSchema<
		{
			readonly type: v.StringSchema<undefined>;
		},
		undefined
	>;
	policySnapshotRequired: v.ObjectSchema<
		{
			readonly code: v.LiteralSchema<'POLICY_SNAPSHOT_REQUIRED', undefined>;
		},
		undefined
	>;
	policySnapshotInvalid: v.ObjectSchema<
		{
			readonly code: v.LiteralSchema<'POLICY_SNAPSHOT_INVALID', undefined>;
		},
		undefined
	>;
	policySnapshotExpired: v.ObjectSchema<
		{
			readonly code: v.LiteralSchema<'POLICY_SNAPSHOT_EXPIRED', undefined>;
		},
		undefined
	>;
	legalDocumentSnapshotRequired: v.ObjectSchema<
		{
			readonly code: v.LiteralSchema<
				'LEGAL_DOCUMENT_SNAPSHOT_REQUIRED',
				undefined
			>;
		},
		undefined
	>;
	legalDocumentSnapshotInvalid: v.ObjectSchema<
		{
			readonly code: v.LiteralSchema<
				'LEGAL_DOCUMENT_SNAPSHOT_INVALID',
				undefined
			>;
		},
		undefined
	>;
	legalDocumentSnapshotExpired: v.ObjectSchema<
		{
			readonly code: v.LiteralSchema<
				'LEGAL_DOCUMENT_SNAPSHOT_EXPIRED',
				undefined
			>;
		},
		undefined
	>;
	legalDocumentProofRequired: v.ObjectSchema<
		{
			readonly code: v.LiteralSchema<
				'LEGAL_DOCUMENT_PROOF_REQUIRED',
				undefined
			>;
		},
		undefined
	>;
	purposeCreationFailed: v.ObjectSchema<
		{
			readonly purposeCode: v.StringSchema<undefined>;
		},
		undefined
	>;
	consentCreationFailed: v.ObjectSchema<
		{
			readonly subjectId: v.StringSchema<undefined>;
			readonly domain: v.StringSchema<undefined>;
		},
		undefined
	>;
};
export type PostSubjectInput = v.InferOutput<typeof postSubjectInputSchema>;
export type PostSubjectOutput = v.InferOutput<typeof postSubjectOutputSchema>;
