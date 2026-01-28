/**
 * PATCH /subject/:id schemas - Link external ID to subject.
 *
 * @packageDocumentation
 */

import * as v from 'valibot';
import { subjectIdSchema } from './post';

/**
 * PATCH /subject/:id combined input schema (path param + body).
 * Hono merges path params and body into a single input object.
 */
export const patchSubjectFullInputSchema = v.object({
	/** Subject ID from path parameter */
	id: subjectIdSchema,
	/** External user ID to link */
	externalId: v.string(),
	/** Identity provider name (optional) */
	identityProvider: v.optional(v.string()),
});

/**
 * @deprecated Use patchSubjectFullInputSchema instead. Kept for backward compatibility.
 */
export const patchSubjectParamsSchema = v.object({
	id: subjectIdSchema,
});

/**
 * @deprecated Use patchSubjectFullInputSchema instead. Kept for backward compatibility.
 */
export const patchSubjectInputSchema = v.object({
	externalId: v.string(),
	identityProvider: v.optional(v.string()),
});

/**
 * PATCH /subject/:id output schema
 */
export const patchSubjectOutputSchema = v.object({
	success: v.boolean(),
	subject: v.object({
		id: v.string(),
		externalId: v.string(),
		isIdentified: v.boolean(),
	}),
});

/**
 * Error schemas for PATCH /subject/:id
 */
export const patchSubjectErrorSchemas = {
	inputValidationFailed: v.object({
		formErrors: v.array(v.string()),
		fieldErrors: v.record(v.string(), v.array(v.string())),
	}),
	subjectNotFound: v.object({
		subjectId: v.string(),
	}),
};

// Type exports
export type PatchSubjectFullInput = v.InferOutput<
	typeof patchSubjectFullInputSchema
>;
export type PatchSubjectParams = v.InferOutput<typeof patchSubjectParamsSchema>;
export type PatchSubjectInput = v.InferOutput<typeof patchSubjectInputSchema>;
export type PatchSubjectOutput = v.InferOutput<typeof patchSubjectOutputSchema>;
