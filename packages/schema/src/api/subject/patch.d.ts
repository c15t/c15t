/**
 * PATCH /subject/:id schemas - Link external ID to subject.
 *
 * @packageDocumentation
 */
import * as v from 'valibot';
/**
 * PATCH /subject/:id combined input schema (path param + body).
 * Hono merges path params and body into a single input object.
 */
export declare const patchSubjectFullInputSchema: v.ObjectSchema<
	{
		/** Subject ID from path parameter */
		readonly id: v.SchemaWithPipe<
			readonly [
				v.StringSchema<undefined>,
				v.RegexAction<string, 'Invalid subject ID format'>,
			]
		>;
		/** External user ID to link */
		readonly externalId: v.StringSchema<undefined>;
		/** Identity provider name (optional) */
		readonly identityProvider: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
	},
	undefined
>;
/**
 * PATCH /subject/:id output schema
 */
export declare const patchSubjectOutputSchema: v.ObjectSchema<
	{
		readonly success: v.BooleanSchema<undefined>;
		readonly subject: v.ObjectSchema<
			{
				readonly id: v.StringSchema<undefined>;
				readonly externalId: v.StringSchema<undefined>;
			},
			undefined
		>;
	},
	undefined
>;
/**
 * Error schemas for PATCH /subject/:id
 */
export declare const patchSubjectErrorSchemas: {
	inputValidationFailed: v.ObjectSchema<
		{
			readonly formErrors: v.ArraySchema<v.StringSchema<undefined>, undefined>;
			readonly fieldErrors: v.RecordSchema<
				v.StringSchema<undefined>,
				v.ArraySchema<v.StringSchema<undefined>, undefined>,
				undefined
			>;
		},
		undefined
	>;
	subjectNotFound: v.ObjectSchema<
		{
			readonly subjectId: v.StringSchema<undefined>;
		},
		undefined
	>;
};
export type PatchSubjectFullInput = v.InferOutput<
	typeof patchSubjectFullInputSchema
>;
export type PatchSubjectOutput = v.InferOutput<typeof patchSubjectOutputSchema>;
