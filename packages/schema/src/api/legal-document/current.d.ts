import * as v from 'valibot';
export declare const legalDocumentCurrentParamsSchema: v.ObjectSchema<
	{
		readonly type: any;
	},
	undefined
>;
export declare const legalDocumentCurrentInputSchema: v.ObjectSchema<
	{
		readonly version: v.StringSchema<undefined>;
		readonly hash: v.StringSchema<undefined>;
		readonly effectiveDate: v.StringSchema<undefined>;
	},
	undefined
>;
export declare const legalDocumentCurrentPolicySchema: v.ObjectSchema<
	{
		readonly id: v.StringSchema<undefined>;
		readonly type: any;
		readonly version: v.StringSchema<undefined>;
		readonly hash: v.StringSchema<undefined>;
		readonly effectiveDate: v.DateSchema<undefined>;
		readonly isActive: v.BooleanSchema<undefined>;
	},
	undefined
>;
export declare const legalDocumentCurrentOutputSchema: v.ObjectSchema<
	{
		readonly policy: v.ObjectSchema<
			{
				readonly id: v.StringSchema<undefined>;
				readonly type: any;
				readonly version: v.StringSchema<undefined>;
				readonly hash: v.StringSchema<undefined>;
				readonly effectiveDate: v.DateSchema<undefined>;
				readonly isActive: v.BooleanSchema<undefined>;
			},
			undefined
		>;
	},
	undefined
>;
export declare const legalDocumentCurrentErrorSchemas: {
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
	conflict: v.ObjectSchema<
		{
			readonly code: v.LiteralSchema<
				'LEGAL_DOCUMENT_RELEASE_CONFLICT',
				undefined
			>;
		},
		undefined
	>;
};
export type LegalDocumentCurrentParams = v.InferOutput<
	typeof legalDocumentCurrentParamsSchema
>;
export type LegalDocumentCurrentInput = v.InferOutput<
	typeof legalDocumentCurrentInputSchema
>;
export type LegalDocumentCurrentOutput = v.InferOutput<
	typeof legalDocumentCurrentOutputSchema
>;
