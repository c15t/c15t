import { z } from 'zod';

/**
 * Output schema for status endpoint
 */
export const statusOutputSchema = z.object({
	version: z.string(),
	timestamp: z.date(),
	client: z.object({
		ip: z.string().nullable(),
		acceptLanguage: z.string().nullable(),
		userAgent: z.string().nullable(),
		region: z.object({
			countryCode: z.string().nullable(),
			regionCode: z.string().nullable(),
		}),
	}),
});

export type StatusOutput = z.infer<typeof statusOutputSchema>;
