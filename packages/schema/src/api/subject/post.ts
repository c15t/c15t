/**
 * POST /subject schemas - Records consent (append-only).
 *
 * @packageDocumentation
 */

import * as v from 'valibot';
import {
	legalDocumentPolicyTypeSchema,
	policyTypeSchema,
} from '../../domain/consent-policy';

/**
 * Base subject ID validation - must be in sub_xxx format
 */
export const subjectIdSchema = v.pipe(
	v.string(),
	v.regex(/^sub_[1-9A-HJ-NP-Za-km-z]+$/, 'Invalid subject ID format'),
	v.description('Client-generated subject ID in sub_xxx format.'),
	v.examples(['sub_2jv6z8n4q9'])
);

/**
 * Base consent input schema for POST /subject
 * Note: subjectId is now required (client-generated)
 */
const baseSubjectConsentSchema = v.object({
	/** Client-generated subject ID in sub_xxx format (required) */
	subjectId: subjectIdSchema,
	/** External subject ID from your auth system (optional) */
	externalSubjectId: v.optional(
		v.pipe(
			v.string(),
			v.description('External user ID from your authentication system.'),
			v.examples(['user_123'])
		)
	),
	/** Identity provider name (optional) */
	identityProvider: v.optional(
		v.pipe(
			v.string(),
			v.description('Identity provider name for the external subject ID.'),
			v.examples(['auth0', 'clerk'])
		)
	),
	/** Domain where consent was given */
	domain: v.pipe(
		v.string(),
		v.description('Domain where consent was collected.'),
		v.examples(['example.com'])
	),
	/** Type of consent */
	type: policyTypeSchema,
	/** Additional metadata */
	metadata: v.optional(
		v.pipe(
			v.record(v.string(), v.unknown()),
			v.description('Additional audit metadata to store with the consent.')
		)
	),
	/** When the consent was given in epoch milliseconds */
	givenAt: v.pipe(
		v.number(),
		v.description('Timestamp when consent was given, in epoch milliseconds.'),
		v.examples([1_735_689_600_000])
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
	/** IAB TCF TC String (only for IAB consents) */
	tcString: v.optional(
		v.pipe(
			v.string(),
			v.description('IAB TCF TC string for IAB consent submissions.')
		)
	),
	/** Which UI component collected this consent (e.g., 'banner', 'dialog', 'widget') */
	uiSource: v.optional(
		v.pipe(
			v.string(),
			v.description('UI surface that collected the consent.'),
			v.examples(['banner', 'dialog', 'widget'])
		)
	),
	/** Consent action type (e.g., 'all', 'necessary', 'custom') */
	consentAction: v.optional(
		v.pipe(
			v.string(),
			v.description('User action that produced this consent state.'),
			v.examples(['all', 'necessary', 'custom'])
		)
	),
	/** Signed policy snapshot token from /init for consistency/auditability */
	policySnapshotToken: v.optional(
		v.pipe(
			v.string(),
			v.description('Signed policy snapshot token returned by /init.')
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
});

/**
 * Cookie banner consent - requires preferences
 */
export const subjectCookieBannerInputSchema = v.object({
	...baseSubjectConsentSchema.entries,
	type: v.literal('cookie_banner'),
	preferences: v.pipe(
		v.record(v.string(), v.boolean()),
		v.description('Consent preferences keyed by category.'),
		v.examples([{ necessary: true, measurement: true, marketing: false }])
	),
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
	type: legalDocumentPolicyTypeSchema,
	policyId: v.optional(
		v.pipe(
			v.string(),
			v.description(
				'Internal c15t policy ID. Prefer documentSnapshotToken or policyHash for legal documents when available.'
			),
			v.examples(['pol_123'])
		)
	),
	policyHash: v.optional(
		v.pipe(
			v.string(),
			v.description('Release hash for the legal document being accepted.'),
			v.examples(['sha256:abc123'])
		)
	),
	preferences: v.optional(
		v.pipe(
			v.record(v.string(), v.boolean()),
			v.description('Optional consent preferences keyed by category.')
		)
	),
});

/**
 * Other consent types
 */
export const subjectOtherConsentInputSchema = v.object({
	...baseSubjectConsentSchema.entries,
	type: v.picklist(['marketing_communications', 'age_verification', 'other']),
	preferences: v.optional(
		v.pipe(
			v.record(v.string(), v.boolean()),
			v.description('Optional consent preferences keyed by category.')
		)
	),
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
	subjectId: v.string(),
	consentId: v.string(),
	domainId: v.string(),
	domain: v.string(),
	type: policyTypeSchema,
	metadata: v.optional(v.record(v.string(), v.unknown())),
	appliedPreferences: v.optional(v.record(v.string(), v.boolean())),
	uiSource: v.optional(v.string()),
	givenAt: v.date(),
});

/**
 * Error schemas for POST /subject
 */
export const postSubjectErrorSchemas = {
	inputValidationFailed: v.object({
		formErrors: v.array(v.string()),
		fieldErrors: v.record(v.string(), v.array(v.string())),
	}),
	subjectCreationFailed: v.object({
		subjectId: v.string(),
	}),
	domainCreationFailed: v.object({
		domain: v.string(),
	}),
	policyNotFound: v.object({
		policyId: v.optional(v.string()),
		type: v.string(),
	}),
	policyInactive: v.object({
		policyId: v.string(),
		type: v.string(),
	}),
	policyCreationFailed: v.object({
		type: v.string(),
	}),
	policySnapshotRequired: v.object({
		code: v.literal('POLICY_SNAPSHOT_REQUIRED'),
	}),
	policySnapshotInvalid: v.object({
		code: v.literal('POLICY_SNAPSHOT_INVALID'),
	}),
	policySnapshotExpired: v.object({
		code: v.literal('POLICY_SNAPSHOT_EXPIRED'),
	}),
	legalDocumentSnapshotRequired: v.object({
		code: v.literal('LEGAL_DOCUMENT_SNAPSHOT_REQUIRED'),
	}),
	legalDocumentSnapshotInvalid: v.object({
		code: v.literal('LEGAL_DOCUMENT_SNAPSHOT_INVALID'),
	}),
	legalDocumentSnapshotExpired: v.object({
		code: v.literal('LEGAL_DOCUMENT_SNAPSHOT_EXPIRED'),
	}),
	legalDocumentProofRequired: v.object({
		code: v.literal('LEGAL_DOCUMENT_PROOF_REQUIRED'),
	}),
	purposeCreationFailed: v.object({
		purposeCode: v.string(),
	}),
	consentCreationFailed: v.object({
		subjectId: v.string(),
		domain: v.string(),
	}),
};

// Type exports
export type PostSubjectInput = v.InferOutput<typeof postSubjectInputSchema>;
export type PostSubjectOutput = v.InferOutput<typeof postSubjectOutputSchema>;
