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
	version: v.pipe(
		v.string(),
		v.description('Release version identifier for the legal document.'),
		v.examples(['2026-01-01'])
	),
	hash: v.pipe(
		v.string(),
		v.description('Content hash for the legal document release.'),
		v.examples(['sha256:abc123'])
	),
	effectiveDate: v.pipe(
		v.string(),
		v.description('ISO 8601 effective date for the legal document release.'),
		v.examples(['2026-01-01T00:00:00.000Z'])
	),
});

export const legalDocumentCurrentPolicySchema = v.object({
	id: v.string(),
	type: legalDocumentPolicyTypeSchema,
	version: v.string(),
	hash: v.string(),
	effectiveDate: v.date(),
	isActive: v.boolean(),
});

export const legalDocumentCurrentOutputSchema = v.object({
	policy: legalDocumentCurrentPolicySchema,
});

export const legalDocumentCurrentErrorSchemas = {
	inputValidationFailed: v.object({
		formErrors: v.array(v.string()),
		fieldErrors: v.record(v.string(), v.array(v.string())),
	}),
	unauthorized: v.object({
		message: v.string(),
	}),
	conflict: v.object({
		code: v.literal('LEGAL_DOCUMENT_RELEASE_CONFLICT'),
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
