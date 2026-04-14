import * as v from 'valibot';
import { legalDocumentPolicyTypeSchema } from '~/domain/consent-policy';

export const legalDocumentCurrentParamsSchema = v.object({
	type: legalDocumentPolicyTypeSchema,
});

export const legalDocumentCurrentInputSchema = v.object({
	version: v.string(),
	hash: v.string(),
	effectiveDate: v.string(),
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
