import { os } from '~/contracts';
import type { Adapter } from '~/pkgs/db-adapters/types';
import { DoubleTieError, ERROR_CODES } from '~/pkgs/results';
import type { Consent } from '~/schema/consent';
import type { ConsentRecord } from '~/schema/consent-record';
import type { C15TContext } from '~/types';

/**
 * Handles the creation of a new consent record.
 *
 * This handler processes consent submissions, creates necessary records in the database,
 * and returns a formatted response. It handles different types of consent (cookie banner,
 * policy-based, and other types) with their specific requirements.
 *
 * @throws {DoubleTieError} When:
 * - Subject creation fails
 * - Policy is not found or inactive
 * - Database transaction fails
 * - Required fields are missing
 *
 * @example
 * ```ts
 * // Cookie banner consent
 * const response = await postConsent({
 *   type: 'cookie_banner',
 *   domain: 'example.com',
 *   preferences: { analytics: true, marketing: false }
 * });
 * ```
 */

export const postConsent = os.consent.post.handler(
	async ({ input, context }) => {
		const typedContext = context as C15TContext;

		const logger = typedContext.logger;
		logger.info('Handling post-consent request');

		const {
			type,
			subjectId,
			externalSubjectId,
			domain,
			metadata,
			preferences,
		} = input;

		logger.debug('Request parameters', {
			type,
			subjectId,
			externalSubjectId,
			domain,
		});

		try {
			const subject = await typedContext.registry.findOrCreateSubject({
				subjectId,
				externalSubjectId,
				ipAddress: typedContext.ipAddress || 'unknown',
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
			const domainRecord =
				await typedContext.registry.findOrCreateDomain(domain);

			const now = new Date();
			let policyId: string | undefined;
			let purposeIds: string[] = [];

			if ('policyId' in input && input.policyId) {
				policyId = input.policyId;

				// Verify the policy exists and is active
				const policy =
					await typedContext.registry.findConsentPolicyById(policyId);
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
				const policy = await typedContext.registry.findOrCreatePolicy(type);
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
			if (preferences) {
				purposeIds = await Promise.all(
					Object.entries(preferences)
						.filter(([_, isConsented]) => isConsented)
						.map(async ([purposeCode]) => {
							let existingPurpose =
								await typedContext.registry.findConsentPurposeByCode(
									purposeCode
								);
							if (!existingPurpose) {
								existingPurpose =
									await typedContext.registry.createConsentPurpose({
										code: purposeCode,
										name: purposeCode,
										description: `Auto-created consentPurpose for ${purposeCode}`,
										isActive: true,
										isEssential: false,
										legalBasis: 'consent',
										createdAt: now,
										updatedAt: now,
									});
							}
							return existingPurpose.id;
						})
				);
			}

			const result = await typedContext.adapter.transaction({
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
							ipAddress: typedContext.ipAddress || 'unknown',
							agent: typedContext.userAgent || 'unknown',
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
							ipAddress: typedContext.ipAddress || 'unknown',
							agent: typedContext.userAgent || 'unknown',
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

			// Return the response in the format defined by the contract
			return {
				id: result.consent.id,
				subjectId: subject.id,
				externalSubjectId: subject.externalId ?? undefined,
				domainId: domainRecord.id,
				domain: domainRecord.name,
				type,
				status: result.consent.status,
				recordId: result.record.id,
				metadata,
				givenAt: result.consent.givenAt,
			};
		} catch (error) {
			// Log all errors properly
			logger.error('Error in post-consent handler', {
				error: error instanceof Error ? error.message : String(error),
				errorType:
					error instanceof Error ? error.constructor.name : typeof error,
			});

			// Re-throw to let error middleware handle it
			throw error;
		}
	}
);
