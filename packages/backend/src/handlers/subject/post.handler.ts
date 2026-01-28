/**
 * POST /subject handler - Records consent (append-only).
 *
 * @packageDocumentation
 */

import { ORPCError } from '@orpc/server';
import { os } from '~/contracts';
import { generateUniqueId } from '~/db/registry/utils';
import type { C15TContext } from '~/types';

/**
 * Handles the creation of a new consent record for a subject.
 *
 * This handler processes consent submissions with client-generated subject IDs.
 * Each call creates a new consent record (append-only), preserving the full audit trail.
 *
 * Key differences from the legacy POST /consent/set:
 * - subjectId is required (client-generated)
 * - Creates subject if it doesn't exist
 * - Always appends new consent records (never updates)
 */
export const postSubject = os.subject.post.handler(
	async ({ input, context }) => {
		const typedContext = context as C15TContext;
		const logger = typedContext.logger;
		logger.info('Handling POST /subject request');

		const { db, registry } = typedContext;

		const {
			type,
			subjectId,
			identityProvider,
			externalSubjectId,
			domain,
			metadata,
			preferences,
			givenAt: givenAtEpoch,
		} = input;

		const givenAt = new Date(givenAtEpoch);

		logger.debug('Request parameters', {
			type,
			subjectId,
			identityProvider,
			externalSubjectId,
			domain,
		});

		try {
			// Find or create subject with the client-provided ID
			const subject = await registry.findOrCreateSubject({
				subjectId,
				externalSubjectId,
				identityProvider,
				ipAddress: typedContext.ipAddress,
			});

			if (!subject) {
				throw new ORPCError('SUBJECT_CREATION_FAILED', {
					data: {
						subjectId,
					},
				});
			}

			logger.debug('Subject found/created', { subjectId: subject.id });

			const domainRecord = await registry.findOrCreateDomain(domain);

			if (!domainRecord) {
				throw new ORPCError('DOMAIN_CREATION_FAILED', {
					data: {
						domain,
					},
				});
			}

			let policyId: string | undefined;
			let purposeIds: string[] = [];

			if ('policyId' in input && input.policyId) {
				policyId = input.policyId;

				// Verify the policy exists and is active
				const policy = await registry.findConsentPolicyById(policyId);
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
				const policy = await registry.findOrCreatePolicy(type);
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

				logger.debug('Consented purposes', { consentedPurposes });

				// Batch fetch all existing purposes
				const purposesRaw = await Promise.all(
					consentedPurposes.map((purposeCode) =>
						registry.findOrCreateConsentPurposeByCode(purposeCode)
					)
				);

				const purposes = purposesRaw
					.map((purpose) => purpose?.id ?? null)
					.filter((id): id is string => Boolean(id));

				logger.debug('Filtered purposes', { purposes });

				if (purposes.length === 0) {
					logger.warn(
						'No valid purpose IDs found after filtering. Using empty list.',
						{ consentedPurposes }
					);
				}

				purposeIds = purposes;
			}

			const result = await db.transaction(async (tx) => {
				logger.debug('Creating consent record', {
					subjectId: subject.id,
					domainId: domainRecord.id,
					policyId,
					purposeIds,
				});

				// Always create a new consent record (append-only)
				const consentRecord = await tx.create('consent', {
					id: await generateUniqueId(tx, 'consent', typedContext),
					subjectId: subject.id,
					domainId: domainRecord.id,
					policyId,
					purposeIds: { json: purposeIds },
					status: 'active',
					isActive: true,
					ipAddress: typedContext.ipAddress,
					userAgent: typedContext.userAgent,
					jurisdiction: input.jurisdiction,
					jurisdictionModel: input.jurisdictionModel,
					tcString: input.tcString,
					givenAt,
				});

				logger.debug('Created consent', { consentRecord: consentRecord.id });

				const record = await tx.create('consentRecord', {
					id: await generateUniqueId(tx, 'consentRecord', typedContext),
					subjectId: subject.id,
					consentId: consentRecord.id,
					actionType: 'consent_given',
					details: metadata,
				});

				logger.debug('Created record entry', { record: record.id });

				await tx.create('auditLog', {
					id: await generateUniqueId(tx, 'auditLog', typedContext),
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

				logger.debug('Created audit log');

				if (!consentRecord || !record) {
					throw new ORPCError('CONSENT_CREATION_FAILED', {
						data: {
							subjectId: subject.id,
							domain,
						},
					});
				}

				return {
					consent: consentRecord,
					record,
				};
			});

			// Return the response in the format defined by the contract
			return {
				subjectId: subject.id,
				consentId: result.consent.id,
				domainId: domainRecord.id,
				domain: domainRecord.name,
				type,
				status: result.consent.status,
				recordId: result.record.id,
				metadata,
				givenAt: result.consent.givenAt,
			};
		} catch (error) {
			logger.error('Error in POST /subject handler', {
				error: error instanceof Error ? error.message : String(error),
				errorType:
					error instanceof Error ? error.constructor.name : typeof error,
			});

			if (error instanceof ORPCError) {
				throw error;
			}

			throw new ORPCError('INTERNAL_SERVER_ERROR', {
				message: error instanceof Error ? error.message : String(error),
			});
		}
	}
);
