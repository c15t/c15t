/**
 * GET /subject/:id schemas - Check this device's consent status.
 *
 * @packageDocumentation
 */

import * as v from 'valibot';
import { subjectIdSchema } from './post';

/**
 * GET /subject/:id combined input schema (path param + query params).
 * Hono flattens path params and query params into a single input object.
 */
export const getSubjectInputSchema = v.object({
	/** Subject ID from path parameter */
	id: subjectIdSchema,
	/** Filter by consent type(s), comma-separated (query param) */
	type: v.optional(v.string()),
});

/**
 * @deprecated Use getSubjectInputSchema instead. Kept for backward compatibility.
 */
export const getSubjectQuerySchema = v.object({
	/** Filter by consent type(s), comma-separated */
	type: v.optional(v.string()),
});

/**
 * @deprecated Use getSubjectInputSchema instead. Kept for backward compatibility.
 */
export const getSubjectParamsSchema = v.object({
	id: subjectIdSchema,
});

/**
 * Consent item in GET /subject/:id response
 */
export const consentItemSchema = v.object({
	id: v.string(),
	type: v.string(),
	policyId: v.optional(v.string()),
	isLatestPolicy: v.boolean(),
	preferences: v.optional(v.record(v.string(), v.boolean())),
	givenAt: v.date(),
});

/**
 * GET /subject/:id output schema
 */
export const getSubjectOutputSchema = v.object({
	subject: v.object({
		id: v.string(),
		externalId: v.optional(v.string()),
		isIdentified: v.boolean(),
		createdAt: v.optional(v.date()),
	}),
	consents: v.array(consentItemSchema),
	isValid: v.boolean(),
});

/**
 * Error schemas for GET /subject/:id
 */
export const getSubjectErrorSchemas = {
	inputValidationFailed: v.object({
		formErrors: v.array(v.string()),
		fieldErrors: v.record(v.string(), v.array(v.string())),
	}),
	subjectNotFound: v.object({
		subjectId: v.string(),
	}),
};

// Type exports
export type GetSubjectInput = v.InferOutput<typeof getSubjectInputSchema>;
export type GetSubjectQuery = v.InferOutput<typeof getSubjectQuerySchema>;
export type GetSubjectParams = v.InferOutput<typeof getSubjectParamsSchema>;
export type GetSubjectOutput = v.InferOutput<typeof getSubjectOutputSchema>;
export type ConsentItem = v.InferOutput<typeof consentItemSchema>;
