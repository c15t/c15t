import { createError, readBody } from 'h3';
import { z } from 'zod';
import { defineValidatedRoute } from '../../utils/define-validated-route';

// Schema definitions
const ConsentType = z.enum([
	'cookie_banner',
	'privacy_policy',
	'dpa',
	'terms_of_service',
	'marketing_communications',
	'age_verification',
	'other',
]);

const baseConsentSchema = z.object({
	subjectId: z.string().optional(),
	externalSubjectId: z.string().optional(),
	domain: z.string(),
	type: ConsentType,
	metadata: z.record(z.unknown()).optional(),
});

const cookieBannerSchema = baseConsentSchema.extend({
	type: z.literal('cookie_banner'),
	preferences: z.record(z.boolean()),
});

const policyBasedSchema = baseConsentSchema.extend({
	type: z.enum(['privacy_policy', 'dpa', 'terms_of_service']),
	policyId: z.string().optional(),
	preferences: z.record(z.boolean()).optional(),
});

const otherConsentSchema = baseConsentSchema.extend({
	type: z.enum(['marketing_communications', 'age_verification', 'other']),
	preferences: z.record(z.boolean()).optional(),
});

const setConsentSchema = z.discriminatedUnion('type', [
	cookieBannerSchema,
	policyBasedSchema,
	otherConsentSchema,
]);

// Mock storage (replace with proper storage once ORM is integrated)
const mockStorage = new Map();

export default defineValidatedRoute({
	validations: {
		body: setConsentSchema,
	},
	handler: async (event) => {
		try {
			const { body } = event.context.validated;

			const now = new Date();
			const consentId = `con_${Math.random().toString(36).slice(2)}`;
			const recordId = `rec_${Math.random().toString(36).slice(2)}`;

			// Create mock subject ID if not provided
			const subjectId =
				body.subjectId || `sub_${Math.random().toString(36).slice(2)}`;

			// Store mock consent record
			const consentRecord = {
				id: consentId,
				subjectId,
				externalSubjectId: body.externalSubjectId,
				domain: body.domain,
				type: body.type,
				status: 'active',
				preferences: 'preferences' in body ? body.preferences : undefined,
				metadata: body.metadata,
				givenAt: now.toISOString(),
				recordId,
			};

			// Store in mock storage
			mockStorage.set(consentId, consentRecord);

			return {
				id: consentId,
				subjectId,
				externalSubjectId: body.externalSubjectId,
				domain: body.domain,
				type: body.type,
				status: 'active',
				recordId,
				metadata: body.metadata,
				givenAt: now.toISOString(),
			};
		} catch (error) {
			if (error instanceof z.ZodError) {
				throw createError({
					statusCode: 400,
					message: 'Invalid consent data provided',
					data: {
						details: error.errors,
					},
				});
			}

			throw createError({
				statusCode: 500,
				message: 'Failed to set consent',
				data: {
					error: error instanceof Error ? error.message : String(error),
				},
			});
		}
	},
});
