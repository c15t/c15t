import * as v from 'valibot';
export declare const domainSchema: v.ObjectSchema<
	{
		readonly id: v.StringSchema<undefined>;
		readonly name: v.StringSchema<undefined>;
		readonly createdAt: v.OptionalSchema<v.DateSchema<undefined>, () => Date>;
		readonly updatedAt: v.OptionalSchema<v.DateSchema<undefined>, () => Date>;
		readonly tenantId: v.NullishSchema<v.StringSchema<undefined>, undefined>;
	},
	undefined
>;
export type Domain = v.InferOutput<typeof domainSchema>;
