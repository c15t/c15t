/**
 * GET /subjects schemas - List subjects by externalId (requires API key).
 *
 * @packageDocumentation
 */

import { z } from 'zod';
import { consentItemSchema } from './get';

/**
 * GET /subjects query params (requires API key)
 */
export const listSubjectsQuerySchema = z.object({
	externalId: z.string(),
});

/**
 * Subject item in GET /subjects response
 */
export const subjectItemSchema = z.object({
	id: z.string(),
	externalId: z.string(),
	isIdentified: z.boolean(),
	createdAt: z.date(),
	consents: z.array(consentItemSchema),
});

/**
 * GET /subjects output schema
 */
export const listSubjectsOutputSchema = z.object({
	subjects: z.array(subjectItemSchema),
});

/**
 * Error schemas for GET /subjects
 */
export const listSubjectsErrorSchemas = {
	inputValidationFailed: z.object({
		formErrors: z.array(z.string()),
		fieldErrors: z.record(z.string(), z.array(z.string())),
	}),
	unauthorized: z.object({
		message: z.string(),
	}),
	externalIdRequired: z.object({
		message: z.string(),
	}),
};

// Type exports
export type ListSubjectsQuery = z.infer<typeof listSubjectsQuerySchema>;
export type ListSubjectsOutput = z.infer<typeof listSubjectsOutputSchema>;
export type SubjectItem = z.infer<typeof subjectItemSchema>;
