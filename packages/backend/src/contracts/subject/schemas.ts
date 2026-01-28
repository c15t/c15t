/**
 * Subject API schemas - re-exported from @c15t/schema.
 *
 * @remarks
 * This file re-exports all subject schemas from @c15t/schema.
 * The schemas are defined in the schema package as the source of truth.
 *
 * @packageDocumentation
 */

// Re-export all subject schemas from @c15t/schema
export {
	type ConsentItem,
	// GET /subject/:id
	consentItemSchema,
	type GetSubjectOutput,
	type GetSubjectParams,
	type GetSubjectQuery,
	getSubjectErrorSchemas,
	getSubjectOutputSchema,
	getSubjectParamsSchema,
	getSubjectQuerySchema,
	type ListSubjectsOutput,
	type ListSubjectsQuery,
	// GET /subjects (list)
	listSubjectsErrorSchemas,
	listSubjectsOutputSchema,
	listSubjectsQuerySchema,
	type PatchSubjectInput,
	type PatchSubjectOutput,
	type PatchSubjectParams,
	type PostSubjectInput,
	type PostSubjectOutput,
	// PATCH /subject/:id
	patchSubjectErrorSchemas,
	patchSubjectInputSchema,
	patchSubjectOutputSchema,
	patchSubjectParamsSchema,
	// POST /subject
	postSubjectErrorSchemas,
	postSubjectInputSchema,
	postSubjectOutputSchema,
	type SubjectItem,
	subjectCookieBannerInputSchema,
	subjectIdSchema,
	subjectItemSchema,
	subjectOtherConsentInputSchema,
	subjectPolicyBasedInputSchema,
} from '@c15t/schema';

// Import error schemas for the combined export
import {
	getSubjectErrorSchemas as getErrors,
	listSubjectsErrorSchemas as listErrors,
	patchSubjectErrorSchemas as patchErrors,
	postSubjectErrorSchemas as postErrors,
} from '@c15t/schema';

/**
 * Combined error schemas for all subject endpoints.
 * This is a convenience export that merges all error schemas.
 */
export const subjectErrorSchemas = {
	...postErrors,
	...getErrors,
	...patchErrors,
	...listErrors,
};
