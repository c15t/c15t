/**
 * GET /subjects schemas - List subjects by externalId (requires API key).
 *
 * @packageDocumentation
 */

import * as v from 'valibot';
import { consentItemSchema } from './get';

/**
 * GET /subjects query params (requires API key)
 */
export const listSubjectsQuerySchema = v.object({
	externalId: v.string(),
});

/**
 * Subject item in GET /subjects response
 */
export const subjectItemSchema = v.object({
	id: v.string(),
	externalId: v.string(),
	isIdentified: v.boolean(),
	createdAt: v.date(),
	consents: v.array(consentItemSchema),
});

/**
 * GET /subjects output schema
 */
export const listSubjectsOutputSchema = v.object({
	subjects: v.array(subjectItemSchema),
});

/**
 * Error schemas for GET /subjects
 */
export const listSubjectsErrorSchemas = {
	inputValidationFailed: v.object({
		formErrors: v.array(v.string()),
		fieldErrors: v.record(v.string(), v.array(v.string())),
	}),
	unauthorized: v.object({
		message: v.string(),
	}),
	externalIdRequired: v.object({
		message: v.string(),
	}),
};

// Type exports
export type ListSubjectsQuery = v.InferOutput<typeof listSubjectsQuerySchema>;
export type ListSubjectsOutput = v.InferOutput<typeof listSubjectsOutputSchema>;
export type SubjectItem = v.InferOutput<typeof subjectItemSchema>;
