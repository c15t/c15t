/**
 * GET /subject/:id schemas - Check this device's consent status.
 *
 * @packageDocumentation
 */
import * as v from 'valibot';
/**
 * GET /subject/:id combined input schema (path param + query params).
 * Hono flattens path params and query params into a single input object.
 */
export declare const getSubjectInputSchema: v.ObjectSchema<
	{
		/** Subject ID from path parameter */
		readonly id: v.SchemaWithPipe<
			readonly [
				v.StringSchema<undefined>,
				v.RegexAction<string, 'Invalid subject ID format'>,
			]
		>;
		/** Filter by consent type(s), comma-separated (query param) */
		readonly type: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
	},
	undefined
>;
/**
 * @deprecated Use getSubjectInputSchema instead. Kept for backward compatibility.
 */
export declare const getSubjectQuerySchema: v.ObjectSchema<
	{
		/** Filter by consent type(s), comma-separated */
		readonly type: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
	},
	undefined
>;
/**
 * @deprecated Use getSubjectInputSchema instead. Kept for backward compatibility.
 */
export declare const getSubjectParamsSchema: v.ObjectSchema<
	{
		readonly id: v.SchemaWithPipe<
			readonly [
				v.StringSchema<undefined>,
				v.RegexAction<string, 'Invalid subject ID format'>,
			]
		>;
	},
	undefined
>;
/**
 * Consent item in GET /subject/:id response
 */
export declare const consentItemSchema: v.ObjectSchema<
	{
		readonly id: v.StringSchema<undefined>;
		readonly type: v.StringSchema<undefined>;
		readonly policyId: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		readonly policyVersion: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		readonly policyHash: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		readonly policyEffectiveDate: v.OptionalSchema<
			v.DateSchema<undefined>,
			undefined
		>;
		readonly isLatestPolicy: v.BooleanSchema<undefined>;
		readonly preferences: v.OptionalSchema<
			v.RecordSchema<
				v.StringSchema<undefined>,
				v.BooleanSchema<undefined>,
				undefined
			>,
			undefined
		>;
		readonly givenAt: v.DateSchema<undefined>;
	},
	undefined
>;
/**
 * GET /subject/:id output schema
 */
export declare const getSubjectOutputSchema: v.ObjectSchema<
	{
		readonly subject: v.ObjectSchema<
			{
				readonly id: v.StringSchema<undefined>;
				readonly externalId: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				readonly createdAt: v.OptionalSchema<
					v.DateSchema<undefined>,
					undefined
				>;
			},
			undefined
		>;
		readonly consents: v.ArraySchema<
			v.ObjectSchema<
				{
					readonly id: v.StringSchema<undefined>;
					readonly type: v.StringSchema<undefined>;
					readonly policyId: v.OptionalSchema<
						v.StringSchema<undefined>,
						undefined
					>;
					readonly policyVersion: v.OptionalSchema<
						v.StringSchema<undefined>,
						undefined
					>;
					readonly policyHash: v.OptionalSchema<
						v.StringSchema<undefined>,
						undefined
					>;
					readonly policyEffectiveDate: v.OptionalSchema<
						v.DateSchema<undefined>,
						undefined
					>;
					readonly isLatestPolicy: v.BooleanSchema<undefined>;
					readonly preferences: v.OptionalSchema<
						v.RecordSchema<
							v.StringSchema<undefined>,
							v.BooleanSchema<undefined>,
							undefined
						>,
						undefined
					>;
					readonly givenAt: v.DateSchema<undefined>;
				},
				undefined
			>,
			undefined
		>;
		readonly isValid: v.BooleanSchema<undefined>;
	},
	undefined
>;
/**
 * Error schemas for GET /subject/:id
 */
export declare const getSubjectErrorSchemas: {
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
export type GetSubjectInput = v.InferOutput<typeof getSubjectInputSchema>;
export type GetSubjectQuery = v.InferOutput<typeof getSubjectQuerySchema>;
export type GetSubjectParams = v.InferOutput<typeof getSubjectParamsSchema>;
export type GetSubjectOutput = v.InferOutput<typeof getSubjectOutputSchema>;
export type ConsentItem = v.InferOutput<typeof consentItemSchema>;
