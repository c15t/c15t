/**
 * GET /subject/:id schemas - Check this device's consent status.
 *
 * @packageDocumentation
 */

import * as v from 'valibot';

import { subjectChoiceWireSchema } from './choice-wire';
import { exemptionPreferencesWireSchema } from './exemption-preferences-wire';
import { subjectIdSchema } from './post';
import { vendorChoiceWireSchema } from './vendor-choice-wire';

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
	 * Absent on rows written before receipts existed; null when unreadable.
	 */
	choice: v.optional(v.nullable(subjectChoiceWireSchema)),
	exemptionPreferences: v.optional(v.nullable(exemptionPreferencesWireSchema)),
	givenAt: v.date(),
	id: v.string(),
	isLatestPolicy: v.boolean(),
	policyEffectiveDate: v.optional(v.date()),
	policyHash: v.optional(v.string()),
	policyId: v.optional(v.string()),
	policyVersion: v.optional(v.string()),
	preferences: v.optional(v.record(v.string(), v.boolean())),
	type: v.string(),
	/**
	 * Vendor grants this submission carried, exactly as the client sent
	 * them. Absent on rows written before vendor consent existed.
	 */
	vendorChoice: v.optional(v.nullable(vendorChoiceWireSchema)),
});

/**
 * GET /subject/:id output schema
 *
 * A non-strict object on purpose: parsing drops keys it does not declare.
 * Backends from 3.0.0-alpha.0 to alpha.3 also return `privacyDirectives`,
 * which v3 no longer reads, and a newer client must still accept that
 * response.
 */
export const getSubjectOutputSchema = v.object({
	consents: v.array(consentItemSchema),
	isValid: v.boolean(),
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
	 * `givenAt`. Null means there is no usable choice. Only backends that
	 * predate receipts omit this field and require client-side reconstruction.
	 */
	subjectChoice: v.optional(v.nullable(subjectChoiceWireSchema)),
	subjectExemptionPreferences: v.optional(
		v.nullable(exemptionPreferencesWireSchema)
	),
	/**
	 * Newest vendor grants across every cookie-banner consent. Null when no
	 * row carries one. Backends that predate vendor consent omit the field.
	 */
	subjectVendorChoice: v.optional(v.nullable(vendorChoiceWireSchema)),
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
