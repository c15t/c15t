/**
 * GET /subject/:id schemas - Check this device's consent status.
 *
 * @packageDocumentation
 */

import { z } from 'zod';
import { subjectIdSchema } from './post';

/**
 * GET /subject/:id combined input schema (path param + query params).
 * oRPC flattens path params and query params into a single input object.
 */
export const getSubjectInputSchema = z.object({
	/** Subject ID from path parameter */
	id: subjectIdSchema,
	/** Filter by consent type(s), comma-separated (query param) */
	type: z.string().optional(),
});

/**
 * @deprecated Use getSubjectInputSchema instead. Kept for backward compatibility.
 */
export const getSubjectQuerySchema = z.object({
	/** Filter by consent type(s), comma-separated */
	type: z.string().optional(),
});

/**
 * @deprecated Use getSubjectInputSchema instead. Kept for backward compatibility.
 */
export const getSubjectParamsSchema = z.object({
	id: subjectIdSchema,
});

/**
 * Consent item in GET /subject/:id response
 */
export const consentItemSchema = z.object({
	id: z.string(),
	type: z.string(),
	policyId: z.string().optional(),
	isLatestPolicy: z.boolean(),
	preferences: z.record(z.string(), z.boolean()).optional(),
	givenAt: z.date(),
});

/**
 * GET /subject/:id output schema
 */
export const getSubjectOutputSchema = z.object({
	subject: z.object({
		id: z.string(),
		externalId: z.string().optional(),
		isIdentified: z.boolean(),
		createdAt: z.date().optional(),
	}),
	consents: z.array(consentItemSchema),
	isValid: z.boolean(),
});

/**
 * Error schemas for GET /subject/:id
 */
export const getSubjectErrorSchemas = {
	inputValidationFailed: z.object({
		formErrors: z.array(z.string()),
		fieldErrors: z.record(z.string(), z.array(z.string())),
	}),
	subjectNotFound: z.object({
		subjectId: z.string(),
	}),
};

// Type exports
export type GetSubjectInput = z.infer<typeof getSubjectInputSchema>;
export type GetSubjectQuery = z.infer<typeof getSubjectQuerySchema>;
export type GetSubjectParams = z.infer<typeof getSubjectParamsSchema>;
export type GetSubjectOutput = z.infer<typeof getSubjectOutputSchema>;
export type ConsentItem = z.infer<typeof consentItemSchema>;
