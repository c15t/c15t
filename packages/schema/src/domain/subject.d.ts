import * as v from 'valibot';
export declare const subjectSchema: v.ObjectSchema<
	{
		readonly id: v.StringSchema<undefined>;
		readonly externalId: v.NullishSchema<v.StringSchema<undefined>, undefined>;
		readonly identityProvider: v.NullishSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		readonly createdAt: v.OptionalSchema<v.DateSchema<undefined>, () => Date>;
		readonly updatedAt: v.OptionalSchema<v.DateSchema<undefined>, () => Date>;
		readonly tenantId: v.NullishSchema<v.StringSchema<undefined>, undefined>;
	},
	undefined
>;
export type Subject = v.InferOutput<typeof subjectSchema>;
