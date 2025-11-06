import { oc } from '@orpc/contract';
import { z } from 'zod';

const identifyUserSchema = z.object({
	consentId: z.string(),
	externalId: z.string(),
	identityProvider: z.string().optional(),
});

export const identifyUserContract = oc
	.route({
		method: 'PATCH',
		path: '/consent/identify',
		description: `Links a subject's external ID to a consent record by consent ID. This is used to identify a user across multiple devices and sessions.`,
		tags: ['consent', 'cookie-banner'],
	})
	.errors({
		CONSENT_NOT_FOUND: {
			status: 404,
			data: z.object({
				consentId: z.string(),
			}),
			error: 'Consent not found',
		},
		IDENTIFICATION_FAILED: {
			status: 500,
			data: z.object({
				consentId: z.string(),
			}),
			error: 'Failed to identify user',
		},
	})
	.input(identifyUserSchema)
	.output(
		z.object({
			success: z.boolean(),
		})
	);
