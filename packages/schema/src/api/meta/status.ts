import * as v from 'valibot';

/**
 * Output schema for status endpoint
 */
export const statusOutputSchema = v.object({
	version: v.string(),
	timestamp: v.date(),
	client: v.object({
		ip: v.nullable(v.string()),
		acceptLanguage: v.nullable(v.string()),
		userAgent: v.nullable(v.string()),
		region: v.object({
			countryCode: v.nullable(v.string()),
			regionCode: v.nullable(v.string()),
		}),
	}),
});

export type StatusOutput = v.InferOutput<typeof statusOutputSchema>;
