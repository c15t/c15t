import * as v from 'valibot';

/**
 * Output schema for status endpoint
 */
export const statusOutputSchema = v.object({
	client: v.object({
		acceptLanguage: v.nullable(v.string()),
		ip: v.nullable(v.string()),
		region: v.object({
			countryCode: v.nullable(v.string()),
			regionCode: v.nullable(v.string()),
		}),

		userAgent: v.nullable(v.string()),
	}),
	timestamp: v.date(),
	version: v.string(),
});

export type StatusOutput = v.InferOutput<typeof statusOutputSchema>;
