/**
 * GET /subject/:id schemas - Check this device's consent status.
 *
 * @packageDocumentation
 */

import * as v from 'valibot';
import { subjectIdSchema } from './post';

/**
 * GET /subject/:id combined input schema (path param + query params).
 *
 * Convenience schema for callers that handle the full input as one object.
 * Route validation uses `getSubjectParamsSchema` (path) and
 * `getSubjectQuerySchema` (query) so `id` and `type` are documented in the
 * correct locations in the generated OpenAPI spec.
 */
export const getSubjectInputSchema = v.object({
	/** Subject ID from path parameter */
	id: v.pipe(
		subjectIdSchema,
		v.description('Client-generated subject ID in sub_xxx format.'),
		v.examples(['sub_2jv6z8n4q9'])
	),
	/** Filter by consent type(s), comma-separated (query param) */
	type: v.optional(
		v.pipe(
			v.string(),
			v.description(
				'Optional consent policy type or comma-separated policy types to filter by.'
			),
			v.examples(['cookie_banner', 'privacy_policy,cookie_banner'])
		)
	),
});

/**
 * GET /subject/:id query params schema.
 */
export const getSubjectQuerySchema = v.object({
	/** Filter by consent type(s), comma-separated */
	type: v.optional(
		v.pipe(
			v.string(),
			v.description(
				'Optional consent policy type or comma-separated policy types to filter by.'
			),
			v.examples(['cookie_banner', 'privacy_policy,cookie_banner'])
		)
	),
});

/**
 * GET /subject/:id path params schema.
 */
export const getSubjectParamsSchema = v.object({
	id: v.pipe(
		subjectIdSchema,
		v.description('Client-generated subject ID in sub_xxx format.'),
		v.examples(['sub_2jv6z8n4q9'])
	),
});

/**
 * Consent item in GET /subject/:id response
 */
export const consentItemSchema = v.object({
	id: v.string(),
	type: v.string(),
	policyId: v.optional(v.string()),
	policyVersion: v.optional(v.string()),
	policyHash: v.optional(v.string()),
	policyEffectiveDate: v.optional(v.date()),
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
