import {
	identifyUserErrorSchemas,
	identifyUserInputSchema,
	identifyUserOutputSchema,
} from '@c15t/schema';
import { oc } from '@orpc/contract';

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
			data: identifyUserErrorSchemas.consentNotFound,
			error: 'Consent not found',
		},
		IDENTIFICATION_FAILED: {
			status: 500,
			data: identifyUserErrorSchemas.identificationFailed,
			error: 'Failed to identify user',
		},
	})
	.input(identifyUserInputSchema)
	.output(identifyUserOutputSchema);
