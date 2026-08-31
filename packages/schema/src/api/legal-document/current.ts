import * as v from 'valibot';

import { legalDocumentPolicyTypeSchema } from '~/domain/consent-policy';

export const legalDocumentCurrentParamsSchema = v.object({
	type: v.pipe(
		legalDocumentPolicyTypeSchema,
		v.description('Current legal document type to sync.'),
		v.examples(['privacy_policy', 'terms_and_conditions'])
	),
});

export const legalDocumentCurrentInputSchema = v.object({
	effectiveDate: v.pipe(
		v.string(),
		v.description('ISO 8601 effective date for the legal document release.'),
		v.examples(['2026-01-01T00:00:00.000Z'])
	),
	hash: v.pipe(
		v.string(),
		v.description('Content hash for the legal document release.'),
		v.examples(['sha256:abc123'])
	),
	version: v.pipe(
		v.string(),
		v.description('Release version identifier for the legal document.'),
		v.examples(['2026-01-01'])
	),
});

export const legalDocumentCurrentPolicySchema = v.object({
	effectiveDate: v.date(),
	hash: v.string(),
	id: v.string(),
	isActive: v.boolean(),
	type: legalDocumentPolicyTypeSchema,
	version: v.string(),
});

export const legalDocumentCurrentOutputSchema = v.object({
	policy: legalDocumentCurrentPolicySchema,
});

export const legalDocumentCurrentErrorSchemas = {
	conflict: v.object({
		code: v.literal('LEGAL_DOCUMENT_RELEASE_CONFLICT'),
	}),
	inputValidationFailed: v.object({
		fieldErrors: v.record(v.string(), v.array(v.string())),

		formErrors: v.array(v.string()),
	}),
	unauthorized: v.object({
		message: v.string(),
	}),
};

export type LegalDocumentCurrentParams = v.InferOutput<
	typeof legalDocumentCurrentParamsSchema
>;
export type LegalDocumentCurrentInput = v.InferOutput<
	typeof legalDocumentCurrentInputSchema
>;
export type LegalDocumentCurrentOutput = v.InferOutput<
	typeof legalDocumentCurrentOutputSchema
>;
