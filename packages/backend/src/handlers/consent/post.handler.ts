import { ORPCError } from '@orpc/server';
import { os } from '~/contracts';
import { generateUniqueId } from '~/registry/utils';
import type { C15TContext } from '~/types';

/**
 * Handles the creation of a new consent record.
 *
 * This handler processes consent submissions, creates necessary records in the database,
 * and returns a formatted response. It handles different types of consent (cookie banner,
 * policy-based, and other types) with their specific requirements.
 *
 * @throws {ORPCError} When:
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

		const { db, registry } = typedContext;

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
			const subject = await registry.findOrCreateSubject({
				subjectId,
				externalSubjectId,
				ipAddress: typedContext.ipAddress,
			});

			if (!subject) {
				throw new ORPCError('SUBJECT_CREATION_FAILED', {
					data: {
						subjectId,
						externalSubjectId,
					},
				});
			}

			logger.debug('Subject found/created', { subjectId: subject.id });
			const domainRecord =
				await typedContext.registry.findOrCreateDomain(domain);

			if (!domainRecord) {
				throw new ORPCError('DOMAIN_CREATION_FAILED', {
					data: {
						domain,
					},
				});
			}

			const now = new Date();
			let policyId: string | undefined;
			const purposeIds: string[] = [];

			if ('policyId' in input && input.policyId) {
				policyId = input.policyId;

				// Verify the policy exists and is active
				const policy =
					await typedContext.registry.findConsentPolicyById(policyId);
				if (!policy) {
					throw new ORPCError('POLICY_NOT_FOUND', {
						data: {
							policyId,
							type,
						},
					});
				}
				if (!policy.isActive) {
					throw new ORPCError('POLICY_INACTIVE', {
						data: {
							policyId,
							type,
						},
					});
				}
			} else {
				const policy = await typedContext.registry.findOrCreatePolicy(type);
				if (!policy) {
					throw new ORPCError('POLICY_CREATION_FAILED', {
						data: {
							type,
						},
					});
				}
				policyId = policy.id;
			}

			// Handle purposes if they exist
			if (preferences) {
				const consentedPurposes = Object.entries(preferences)
					.filter(([_, isConsented]) => isConsented)
					.map(([purposeCode]) => purposeCode);

				// Batch fetch all existing purposes
				await Promise.all(
					consentedPurposes.map((purposeCode) =>
						typedContext.registry.findOrCreateConsentPurposeByCode(purposeCode)
					)
				);
			}

			const result = await db.transaction(async (tx) => {
				const consentRecord = await tx.create('consent', {
					id: await generateUniqueId(db, 'consent'),
					subjectId: subject.id,
					domainId: domainRecord.id,
					policyId,
					purposeIds,
					status: 'active',
					isActive: true,
				});

				const record = await tx.create('consentRecord', {
					id: await generateUniqueId(db, 'consentRecord'),
					subjectId: subject.id,
					consentId: consentRecord.id,
					actionType: 'consent_given',
					details: metadata,
				});

				await tx.create('auditLog', {
					id: await generateUniqueId(db, 'auditLog'),
					subjectId: subject.id,
					entityType: 'consent',
					entityId: consentRecord.id,
					actionType: 'consent_given',
					metadata: {
						consentId: consentRecord.id,
						type,
					},
					ipAddress: typedContext.ipAddress || null,
					userAgent: typedContext.userAgent || null,
					eventTimezone: 'UTC',
				});

				return {
					consent: consentRecord,
					record,
				};
			});

			if (!result || !result.consent || !result.record) {
				throw new ORPCError('CONSENT_CREATION_FAILED', {
					data: {
						subjectId: subject.id,
						domain,
					},
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

			// Re-throw ORPCError instances
			if (error instanceof ORPCError) {
				throw error;
			}

			// Convert other errors to internal server error
			throw new ORPCError('INTERNAL_SERVER_ERROR', {
				message: error instanceof Error ? error.message : String(error),
			});
		}
	}
);
