/**
 * PATCH /subject/:id schemas - Link external ID to subject.
 *
 * @packageDocumentation
 */

import * as v from 'valibot';

import { subjectIdSchema } from './post';

export const patchSubjectParamsSchema = v.object({
	/** Subject ID from path parameter */
	id: v.pipe(
		subjectIdSchema,
		v.description('Client-generated subject ID in sub_xxx format.'),
		v.examples(['sub_2jv6z8n4q9'])
	),
});

export const patchSubjectInputSchema = v.object({
	/** External user ID to link to this subject */
	externalId: v.pipe(
		v.string(),
		v.description('External user ID from your authentication system.'),
		v.examples(['user_123'])
	),
	/** Identity provider that issued the external ID */
	identityProvider: v.optional(
		v.pipe(
			v.string(),
			v.description('Identity provider name for the external ID.'),
			v.examples(['auth0', 'clerk'])
		)
	),
	/**
	 * Signed proof of `externalId`, minted by your server. A request with an
	 * API key does not need one. Without either, the link is stored
	 * unverified: it does not count in reads by external id, and it cannot
	 * replace a verified link.
	 */
	identityToken: v.optional(
		v.pipe(
			v.string(),
			v.description(
				'Identity token signed by your server, proving externalId. Not needed with an API key.'
			)
		)
	),
});

/**
 * PATCH /subject/:id combined input schema (path param + body).
 * Hono merges path params and body into a single input object.
 */
export const patchSubjectFullInputSchema = v.object({
	...patchSubjectParamsSchema.entries,
	...patchSubjectInputSchema.entries,
});

/**
 * PATCH /subject/:id output schema
 *
 * `identityProvider` is always present: the backend stores `'external'` when
 * the request omits it.
 */
export const patchSubjectOutputSchema = v.object({
	subject: v.object({
		externalId: v.string(),
		id: v.string(),
		identityProvider: v.string(),
	}),
});

/**
 * Error schemas for PATCH /subject/:id
 */
export const patchSubjectErrorSchemas = {
	inputValidationFailed: v.object({
		fieldErrors: v.record(v.string(), v.array(v.string())),
		formErrors: v.array(v.string()),
	}),
	subjectNotFound: v.object({
		subjectId: v.string(),
	}),
};

// Type exports
export type PatchSubjectFullInput = v.InferOutput<
	typeof patchSubjectFullInputSchema
>;
export type PatchSubjectInput = v.InferOutput<typeof patchSubjectInputSchema>;
export type PatchSubjectParams = v.InferOutput<typeof patchSubjectParamsSchema>;
export type PatchSubjectOutput = v.InferOutput<typeof patchSubjectOutputSchema>;
