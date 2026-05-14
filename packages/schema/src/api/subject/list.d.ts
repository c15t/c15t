/**
 * GET /subjects schemas - List subjects by externalId (requires API key).
 *
 * @packageDocumentation
 */
import * as v from 'valibot';
/**
 * GET /subjects query params (requires API key)
 */
export declare const listSubjectsQuerySchema: v.ObjectSchema<
	{
		readonly externalId: v.StringSchema<undefined>;
	},
	undefined
>;
/**
 * Subject item in GET /subjects response
 */
export declare const subjectItemSchema: v.ObjectSchema<
	{
		readonly id: v.StringSchema<undefined>;
		readonly externalId: v.StringSchema<undefined>;
		readonly createdAt: v.DateSchema<undefined>;
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
	},
	undefined
>;
/**
 * GET /subjects output schema
 */
export declare const listSubjectsOutputSchema: v.ObjectSchema<
	{
		readonly subjects: v.ArraySchema<
			v.ObjectSchema<
				{
					readonly id: v.StringSchema<undefined>;
					readonly externalId: v.StringSchema<undefined>;
					readonly createdAt: v.DateSchema<undefined>;
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
				},
				undefined
			>,
			undefined
		>;
	},
	undefined
>;
/**
 * Error schemas for GET /subjects
 */
export declare const listSubjectsErrorSchemas: {
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
	unauthorized: v.ObjectSchema<
		{
			readonly message: v.StringSchema<undefined>;
		},
		undefined
	>;
	externalIdRequired: v.ObjectSchema<
		{
			readonly message: v.StringSchema<undefined>;
		},
		undefined
	>;
};
export type ListSubjectsQuery = v.InferOutput<typeof listSubjectsQuerySchema>;
export type ListSubjectsOutput = v.InferOutput<typeof listSubjectsOutputSchema>;
export type SubjectItem = v.InferOutput<typeof subjectItemSchema>;
