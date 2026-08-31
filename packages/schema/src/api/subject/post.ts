/**
 * POST /subject schemas - Records consent (append-only).
 *
 * @packageDocumentation
 */

import * as v from 'valibot';

import {
	consentPolicyTypeSchema,
	legalDocumentPolicyTypeSchema,
	policyTypeSchema,
} from '../../domain/consent-policy';

/**
 * Base subject ID validation - must be in sub_xxx format
 */
export const subjectIdSchema = v.pipe(
	v.string(),
	v.regex(/^sub_[1-9A-HJ-NP-Za-km-z]+$/u, 'Invalid subject ID format'),
	v.description('Client-generated subject ID in sub_xxx format.'),
	v.examples(['sub_2jv6z8n4q9'])
);

/**
 * Base consent input schema for POST /subject
 * Note: subjectId is now required (client-generated)
 */
const baseSubjectConsentSchema = v.object({
	/** Consent action type (e.g., 'all', 'necessary', 'custom') */
	consentAction: v.optional(
		v.pipe(
			v.string(),
			v.description('User action that produced this consent state.'),
			v.examples(['all', 'necessary', 'custom'])
		)
	),
	/** Signed legal-document snapshot token from a rendered document view */
	documentSnapshotToken: v.optional(
		v.pipe(
			v.string(),
			v.description(
				'Signed legal-document snapshot token from the rendered document view.'
			)
		)
	),
	/** Domain where consent was given */
	domain: v.pipe(
		v.string(),
		v.description('Domain where consent was collected.'),
		v.examples(['example.com'])
	),
	/** External subject ID from your auth system (optional) */
	externalSubjectId: v.optional(
		v.pipe(
			v.string(),
			v.description('External user ID from your authentication system.'),
			v.examples(['user_123'])
		)
	),
	/** When the consent was given in epoch milliseconds */
	givenAt: v.pipe(
		v.number(),
		// Keep the timestamp within the range JavaScript Date can represent.
		// The backend derives an ID with Date#toISOString, which throws for an
		// out-of-range value.
		v.minValue(-8_640_000_000_000_000),
		v.maxValue(8_640_000_000_000_000),
		v.description('Timestamp when consent was given, in epoch milliseconds.'),
		v.examples([1_735_689_600_000])
	),
	/** Identity provider name (optional) */
	identityProvider: v.optional(
		v.pipe(
			v.string(),
			v.description('Identity provider name for the external subject ID.'),
			v.examples(['auth0', 'clerk'])
		)
	),
	/** Jurisdiction code (e.g., 'GDPR', 'UK_GDPR', 'CCPA') */
	jurisdiction: v.optional(
		v.pipe(
			v.string(),
			v.description("Jurisdiction code resolved for the subject's location."),
			v.examples(['GDPR', 'UK_GDPR', 'CCPA'])
		)
	),
	/** Consent model used (e.g., 'opt-in', 'opt-out', 'iab') */
	jurisdictionModel: v.optional(
		v.pipe(
			v.string(),
			v.description('Consent model used for the resolved jurisdiction.'),
			v.examples(['opt-in', 'opt-out', 'iab'])
		)
	),
	/** Additional metadata */
	metadata: v.optional(
		v.pipe(
			v.record(v.string(), v.unknown()),
			v.description('Additional audit metadata to store with the consent.')
		)
	),
	/** Signed policy snapshot token from /init for consistency/auditability */
	policySnapshotToken: v.optional(
		v.pipe(
			v.string(),
			v.description('Signed policy snapshot token returned by /init.')
		)
	),
	/** Client-generated subject ID in sub_xxx format (required) */
	subjectId: subjectIdSchema,
	/** IAB TCF TC String (only for IAB consents) */
	tcString: v.optional(
		v.pipe(
			v.string(),
			v.description('IAB TCF TC string for IAB consent submissions.')
		)
	),
	/** Type of consent */
	type: policyTypeSchema,
	/** Which UI component collected this consent (e.g., 'banner', 'dialog', 'widget') */
	uiSource: v.optional(
		v.pipe(
			v.string(),
			v.description('UI surface that collected the consent.'),
			v.examples(['banner', 'dialog', 'widget'])
		)
	),
});

const manifestDecisionInputEntries = {
	/** Country input used by the manifest resolver */
	country: v.optional(
		v.nullable(
			v.pipe(
				v.string(),
				v.description('Country input used by manifest-mode decision replay.'),
				v.examples(['DE'])
			)
		)
	),
	/** Runtime policy fingerprint asserted by manifest-mode clients */
	fingerprint: v.optional(
		v.pipe(
			v.string(),
			v.description(
				'Runtime policy fingerprint asserted by manifest-mode clients.'
			)
		)
	),
	/** Global Privacy Control input used by the manifest resolver */
	gpc: v.optional(
		v.pipe(
			v.boolean(),
			v.description('Global Privacy Control input used by manifest-mode saves.')
		)
	),
	/** Language input used by the manifest resolver */
	language: v.optional(
		v.pipe(
			v.string(),
			v.description('Language input used by manifest-mode decision replay.'),
			v.examples(['en'])
		)
	),
	/** Runtime policy ID asserted by manifest-mode clients for recompute-on-write validation */
	policyId: v.optional(
		v.pipe(
			v.string(),
			v.description(
				'Runtime policy ID asserted by manifest-mode clients for recompute-on-write validation.'
			),
			v.examples(['eu_opt_in'])
		)
	),
	/** Region input used by the manifest resolver */
	region: v.optional(
		v.nullable(
			v.pipe(
				v.string(),
				v.description('Region input used by manifest-mode decision replay.'),
				v.examples(['BE'])
			)
		)
	),
};

/**
 * Cookie banner consent - requires preferences
 */
export const subjectCookieBannerInputSchema = v.object({
	...baseSubjectConsentSchema.entries,
	...manifestDecisionInputEntries,
	preferences: v.pipe(
		v.record(v.string(), v.boolean()),
		v.description('Consent preferences keyed by category.'),
		v.examples([{ marketing: false, measurement: true, necessary: true }])
	),
	type: v.literal('cookie_banner'),
});

/**
 * Policy-based consent
 *
 * For legal documents, callers should prefer `documentSnapshotToken` when
 * available. `policyHash` is intended as a lighter-weight fallback when the
 * client knows the rendered release hash but not the internal c15t policy ID.
 */
export const subjectPolicyBasedInputSchema = v.object({
	...baseSubjectConsentSchema.entries,
	policyHash: v.optional(
		v.pipe(
			v.string(),
			v.description('Release hash for the legal document being accepted.'),
			v.examples(['sha256:abc123'])
		)
	),
	policyId: v.optional(
		v.pipe(
			v.string(),
			v.description(
				'Internal c15t policy ID. Prefer documentSnapshotToken or policyHash for legal documents when available.'
			),
			v.examples(['pol_123'])
		)
	),
	preferences: v.optional(
		v.pipe(
			v.record(v.string(), v.boolean()),
			v.description('Optional consent preferences keyed by category.')
		)
	),
	type: legalDocumentPolicyTypeSchema,
});

/**
 * Other consent types
 */
export const subjectOtherConsentInputSchema = v.object({
	...baseSubjectConsentSchema.entries,
	preferences: v.optional(
		v.pipe(
			v.record(v.string(), v.boolean()),
			v.description('Optional consent preferences keyed by category.')
		)
	),
	type: v.picklist(['marketing_communications', 'age_verification', 'other']),
});

/**
 * POST /subject input schema - variant (discriminated union)
 */
export const postSubjectInputSchema = v.variant('type', [
	subjectCookieBannerInputSchema,
	subjectPolicyBasedInputSchema,
	subjectOtherConsentInputSchema,
]);

/**
 * POST /subject output schema
 */
export const postSubjectOutputSchema = v.object({
	appliedPreferences: v.optional(v.record(v.string(), v.boolean())),
	consentId: v.string(),
	domain: v.string(),
	domainId: v.string(),
	givenAt: v.date(),
	metadata: v.optional(v.record(v.string(), v.unknown())),
	subjectId: v.string(),
	type: consentPolicyTypeSchema,
	uiSource: v.optional(v.string()),
});

/**
 * Error schemas for POST /subject
 */
export const postSubjectErrorSchemas = {
	consentCreationFailed: v.object({
		domain: v.string(),

		subjectId: v.string(),
	}),
	domainCreationFailed: v.object({
		domain: v.string(),
	}),
	inputValidationFailed: v.object({
		fieldErrors: v.record(v.string(), v.array(v.string())),

		formErrors: v.array(v.string()),
	}),
	legalDocumentProofRequired: v.object({
		code: v.literal('LEGAL_DOCUMENT_PROOF_REQUIRED'),
	}),
	legalDocumentSnapshotExpired: v.object({
		code: v.literal('LEGAL_DOCUMENT_SNAPSHOT_EXPIRED'),
	}),
	legalDocumentSnapshotInvalid: v.object({
		code: v.literal('LEGAL_DOCUMENT_SNAPSHOT_INVALID'),
	}),
	legalDocumentSnapshotRequired: v.object({
		code: v.literal('LEGAL_DOCUMENT_SNAPSHOT_REQUIRED'),
	}),
	policyCreationFailed: v.object({
		type: v.string(),
	}),
	policyInactive: v.object({
		policyId: v.string(),
		type: v.string(),
	}),
	policyNotFound: v.object({
		policyId: v.optional(v.string()),
		type: v.string(),
	}),
	policySnapshotExpired: v.object({
		code: v.literal('POLICY_SNAPSHOT_EXPIRED'),
	}),
	policySnapshotInvalid: v.object({
		code: v.literal('POLICY_SNAPSHOT_INVALID'),
	}),
	policySnapshotRequired: v.object({
		code: v.literal('POLICY_SNAPSHOT_REQUIRED'),
	}),
	purposeCreationFailed: v.object({
		purposeCode: v.string(),
	}),
	stalePolicy: v.object({
		code: v.literal('STALE_POLICY'),
		reason: v.optional(v.string()),
	}),
	subjectCreationFailed: v.object({
		subjectId: v.string(),
	}),
};

// Type exports
export type PostSubjectInput = v.InferOutput<typeof postSubjectInputSchema>;
export type PostSubjectOutput = v.InferOutput<typeof postSubjectOutputSchema>;
