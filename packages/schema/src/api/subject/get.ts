/**
 * GET /subject/:id schemas - Check this device's consent status.
 *
 * @packageDocumentation
 */

import * as v from 'valibot';

import { subjectChoiceWireSchema } from './choice-wire';
import { subjectIdSchema } from './post';
import { privacyDirectiveWireSchema } from './privacy-directive';

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
	/**
	 * v3 receipts this submission confirmed, exactly as the client sent them.
	 * Absent on rows written before receipts existed.
	 */
	choice: v.optional(subjectChoiceWireSchema),
	givenAt: v.date(),
	id: v.string(),
	isLatestPolicy: v.boolean(),
	policyEffectiveDate: v.optional(v.date()),
	policyHash: v.optional(v.string()),
	policyId: v.optional(v.string()),
	policyVersion: v.optional(v.string()),
	preferences: v.optional(v.record(v.string(), v.boolean())),
	type: v.string(),
});

/**
 * GET /subject/:id output schema
 */
export const getSubjectOutputSchema = v.object({
	consents: v.array(consentItemSchema),
	isValid: v.boolean(),
	/**
	 * Standing privacy directives that apply to this subject: its own, plus
	 * authenticated identity-level directives when its identity link is
	 * trusted. Absent from backends that predate directives.
	 */
	privacyDirectives: v.optional(v.array(privacyDirectiveWireSchema)),
	subject: v.object({
		createdAt: v.optional(v.date()),

		externalId: v.optional(v.string()),
		id: v.string(),
		/** Provider of `externalId`, as stored. Absent when not identified. */
		identityProvider: v.optional(v.string()),
	}),
	/**
	 * Latest receipt per category across every cookie-banner consent, with
	 * each receipt's original confirmation time and basis. Rows written
	 * before receipts existed contribute legacy-v2 receipts timed at their
	 * `givenAt`. Absent from backends that predate receipts.
	 */
	subjectChoice: v.optional(subjectChoiceWireSchema),
});

/**
 * Error schemas for GET /subject/:id
 */
export const getSubjectErrorSchemas = {
	inputValidationFailed: v.object({
		fieldErrors: v.record(v.string(), v.array(v.string())),
		formErrors: v.array(v.string()),
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
