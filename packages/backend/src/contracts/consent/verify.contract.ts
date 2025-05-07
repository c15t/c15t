import { oc } from '@orpc/contract';
import { z } from 'zod';
import { PolicyTypeSchema } from '~/schema';

/**
 * Contract for the verify consent endpoint
 * Verifies if a user has given consent for a specific policy
 */

// Input schema based on VerifyConsentRequestBody
const verifyConsentInputSchema = z
	.object({
		subjectId: z.string().optional(),
		externalSubjectId: z.string().optional(),
		domain: z.string(),
		type: PolicyTypeSchema,
		policyId: z.string().optional(),
		preferences: z.array(z.string()).optional(),
	})
	.strict();

// Minimal consent schema based on the response interface
const consentSchema = z
	.object({
		id: z.string(),
		purposeIds: z.array(z.string()),
	})
	.passthrough(); // Allow additional properties

// Output schema based on VerifyConsentResponse
export const verifyConsentContract = oc.input(verifyConsentInputSchema).output(
	z.object({
		isValid: z.boolean(),
		reasons: z.array(z.string()).optional(),
		consent: consentSchema.optional(),
	})
);
