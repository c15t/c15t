import { z } from 'zod';
import { defineRoute } from '~/pkgs/api-router/utils/define-route';
import type {} from '~/pkgs/data-model';
import type { Adapter } from '~/pkgs/db-adapters/types';
import { createLogger } from '~/pkgs/logger';
import { DoubleTieError, ERROR_CODES } from '~/pkgs/results';
import type { Consent } from '~/schema/consent';
import { PolicyTypeSchema } from '~/schema/consent-policy';
import type { ConsentRecord } from '~/schema/consent-record';

const baseConsentSchema = z.object({
	subjectId: z.string().optional(),
	externalSubjectId: z.string().optional(),
	domain: z.string(),
	type: PolicyTypeSchema,
	metadata: z.record(z.unknown()).optional(),
});

// Cookie banner needs preferences
const cookieBannerSchema = baseConsentSchema.extend({
	type: z.literal('cookie_banner'),
	preferences: z.record(z.boolean()),
});

// Policy based consent just needs the policy ID
const policyBasedSchema = baseConsentSchema.extend({
	type: z.enum(['privacy_policy', 'dpa', 'terms_and_conditions']),
	policyId: z.string().optional(),
	preferences: z.record(z.boolean()).optional(),
});

// Other consent types just need the base fields
const otherConsentSchema = baseConsentSchema.extend({
	type: z.enum(['marketing_communications', 'age_verification', 'other']),
	preferences: z.record(z.boolean()).optional(),
});

export const SetConsentRequestBody = z.discriminatedUnion('type', [
	cookieBannerSchema,
	policyBasedSchema,
	otherConsentSchema,
]);

export const setConsent = defineRoute({
	path: '/consent/set',
	method: 'post',
	validations: {
		body: SetConsentRequestBody,
	},
	handler: async (event) => {
		// Ensure we have a logger (should already be in context, but add as a fallback)
		const logger = event.context.logger || createLogger();
		logger.info('Handling set-consent request');

		const { body } = event.context.validated;
		const { registry, adapter } = event.context;
		const { type, subjectId, externalSubjectId, domain, metadata } = body;

		logger.debug('Request parameters', {
			type,
			subjectId,
			externalSubjectId,
			domain,
		});

		try {
			const subject = await registry.findOrCreateSubject({
				subjectId,
				externalSubjectId,
				ipAddress: event.context.ipAddress || 'unknown',
			});

			if (!subject) {
				const errMsg = 'Subject not found or could not be created';
				logger.error(errMsg, { subjectId, externalSubjectId });
				throw new DoubleTieError(errMsg, {
					code: ERROR_CODES.BAD_REQUEST,
					status: 400,
					meta: { subjectId, externalSubjectId },
				});
			}

			logger.debug('Subject found/created', { subjectId: subject.id });
			const domainRecord = await registry.findOrCreateDomain(domain);

			const now = new Date();
			let policyId: string | undefined;
			let purposeIds: string[] = [];

			if ('policyId' in body) {
				const { policyId: pid } = body;
				policyId = pid;

				if (!policyId) {
					throw new DoubleTieError('Policy ID is required', {
						code: ERROR_CODES.BAD_REQUEST,
						status: 400,
						meta: { type },
					});
				}

				// Verify the policy exists and is active
				const policy = await registry.findConsentPolicyById(policyId);
				if (!policy) {
					throw new DoubleTieError('Policy not found', {
						code: ERROR_CODES.NOT_FOUND,
						status: 404,
						meta: { policyId },
					});
				}
				if (!policy.isActive) {
					throw new DoubleTieError('Policy is not active', {
						code: ERROR_CODES.CONFLICT,
						status: 409,
						meta: { policyId },
					});
				}
			} else {
				const policy = await registry.findOrCreatePolicy(type);
				if (!policy) {
					throw new DoubleTieError('Failed to create or find policy', {
						code: ERROR_CODES.INTERNAL_SERVER_ERROR,
						status: 500,
						meta: { type },
					});
				}
				policyId = policy.id;
			}

			// Handle purposes if they exist
			if ('preferences' in body && body.preferences) {
				purposeIds = await Promise.all(
					Object.entries(body.preferences)
						.filter(([_, isConsented]) => isConsented)
						.map(async ([purposeCode]) => {
							let existingPurpose =
								await registry.findConsentPurposeByCode(purposeCode);
							if (!existingPurpose) {
								existingPurpose = await registry.createConsentPurpose({
									code: purposeCode,
									name: purposeCode,
									description: `Auto-created consentPurpose for ${purposeCode}`,
									isActive: true,
									isEssential: false,
									dataCategory: 'functional',
									legalBasis: 'consent',
									createdAt: now,
									updatedAt: now,
								});
							}
							return existingPurpose.id;
						})
				);
			}

			const result = await adapter.transaction({
				callback: async (tx: Adapter) => {
					// Create consent record
					const consentRecord = (await tx.create({
						model: 'consent',
						data: {
							subjectId: subject.id,
							domainId: domainRecord.id,
							policyId,
							purposeIds,
							status: 'active',
							isActive: true,
							givenAt: now,
							ipAddress: event.context.ipAddress || 'unknown',
							agent: event.context.userAgent || 'unknown',
							history: [],
						},
					})) as unknown as Consent;

					// Create record entry
					const record = (await tx.create({
						model: 'consentRecord',
						data: {
							subjectId: subject.id,
							consentId: consentRecord.id,
							actionType: 'consent_given',
							details: metadata,
							createdAt: now,
						},
					})) as unknown as ConsentRecord;

					// Create audit log entry
					await tx.create({
						model: 'auditLog',
						data: {
							subjectId: subject.id,
							entityType: 'consent',
							entityId: consentRecord.id,
							actionType: 'consent_given',
							details: {
								consentId: consentRecord.id,
								type,
							},
							timestamp: now,
							ipAddress: event.context.ipAddress || 'unknown',
							agent: event.context.userAgent || 'unknown',
						},
					});

					return {
						consent: consentRecord,
						record,
					};
				},
			});

			if (!result || !result.consent || !result.record) {
				throw new DoubleTieError('Failed to create consent record', {
					code: ERROR_CODES.INTERNAL_SERVER_ERROR,
					status: 500,
					meta: { subjectId: subject.id, domain },
				});
			}

			const response = {
				id: result.consent.id,
				subjectId: subject.id,
				externalSubjectId: subject.externalId ?? undefined,
				domainId: domainRecord.id,
				domain: domainRecord.name,
				type,
				status: result.consent.status,
				recordId: result.record.id,
				metadata,
				givenAt: result.consent.givenAt.toISOString(),
			};

			logger.info('Set-consent successful', { consentId: response.id });

			// Ensure we're returning an object, not a primitive value
			return response;
		} catch (error) {
			// Log all errors properly
			logger.error('Error in set-consent handler', {
				error: error instanceof Error ? error.message : String(error),
				errorType:
					error instanceof Error ? error.constructor.name : typeof error,
			});

			// Re-throw to let error middleware handle it
			throw error;
		}
	},
});
