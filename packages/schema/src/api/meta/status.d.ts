import * as v from 'valibot';
/**
 * Output schema for status endpoint
 */
export declare const statusOutputSchema: v.ObjectSchema<
	{
		readonly version: v.StringSchema<undefined>;
		readonly timestamp: v.DateSchema<undefined>;
		readonly client: v.ObjectSchema<
			{
				readonly ip: v.NullableSchema<v.StringSchema<undefined>, undefined>;
				readonly acceptLanguage: v.NullableSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				readonly userAgent: v.NullableSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				readonly region: v.ObjectSchema<
					{
						readonly countryCode: v.NullableSchema<
							v.StringSchema<undefined>,
							undefined
						>;
						readonly regionCode: v.NullableSchema<
							v.StringSchema<undefined>,
							undefined
						>;
					},
					undefined
				>;
			},
			undefined
		>;
	},
	undefined
>;
export type StatusOutput = v.InferOutput<typeof statusOutputSchema>;
