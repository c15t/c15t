/**
 * PATCH /subject/:id schemas - Link external ID to subject.
 *
 * @packageDocumentation
 */

import { z } from 'zod';
import { subjectIdSchema } from './post';

/**
 * PATCH /subject/:id combined input schema (path param + body).
 * oRPC merges path params and body into a single input object.
 */
export const patchSubjectFullInputSchema = z.object({
	/** Subject ID from path parameter */
	id: subjectIdSchema,
	/** External user ID to link */
	externalId: z.string(),
	/** Identity provider name (optional) */
	identityProvider: z.string().optional(),
});

/**
 * @deprecated Use patchSubjectFullInputSchema instead. Kept for backward compatibility.
 */
export const patchSubjectParamsSchema = z.object({
	id: subjectIdSchema,
});

/**
 * @deprecated Use patchSubjectFullInputSchema instead. Kept for backward compatibility.
 */
export const patchSubjectInputSchema = z.object({
	externalId: z.string(),
	identityProvider: z.string().optional(),
});

/**
 * PATCH /subject/:id output schema
 */
export const patchSubjectOutputSchema = z.object({
	success: z.boolean(),
	subject: z.object({
		id: z.string(),
		externalId: z.string(),
		isIdentified: z.boolean(),
	}),
});

/**
 * Error schemas for PATCH /subject/:id
 */
export const patchSubjectErrorSchemas = {
	inputValidationFailed: z.object({
		formErrors: z.array(z.string()),
		fieldErrors: z.record(z.string(), z.array(z.string())),
	}),
	subjectNotFound: z.object({
		subjectId: z.string(),
	}),
};

// Type exports
export type PatchSubjectFullInput = z.infer<typeof patchSubjectFullInputSchema>;
export type PatchSubjectParams = z.infer<typeof patchSubjectParamsSchema>;
export type PatchSubjectInput = z.infer<typeof patchSubjectInputSchema>;
export type PatchSubjectOutput = z.infer<typeof patchSubjectOutputSchema>;
