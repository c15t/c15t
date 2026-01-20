import { z } from 'zod';

/**
 * Input schema for identify user endpoint
 */
export const identifyUserInputSchema = z.object({
	consentId: z.string(),
	externalId: z.string(),
	identityProvider: z.string().optional(),
});

/**
 * Output schema for identify user endpoint
 */
export const identifyUserOutputSchema = z.object({
	success: z.boolean(),
});

/**
 * Error data schemas for identify user endpoint
 */
export const identifyUserErrorSchemas = {
	consentNotFound: z.object({
		consentId: z.string(),
	}),
	identificationFailed: z.object({
		consentId: z.string(),
	}),
};

export type IdentifyUserInput = z.infer<typeof identifyUserInputSchema>;
export type IdentifyUserOutput = z.infer<typeof identifyUserOutputSchema>;
