/**
 * GET /subjects handler - List subjects by externalId (requires API key).
 *
 * @packageDocumentation
 */

import { ORPCError } from '@orpc/server';
import { os } from '~/contracts';
import type { C15TContext } from '~/types';

/**
 * Handles listing all subjects linked to an external ID.
 *
 * This endpoint requires API key authentication and is intended
 * for server-side use only (Data Subject Access Requests).
 */
export const listSubjects = os.subject.list.handler(
	async ({ input, context }) => {
		const typedContext = context as C15TContext;
		const logger = typedContext.logger;
		logger.info('Handling GET /subjects request');

		const { db, registry } = typedContext;

		// Check API key authentication
		if (!typedContext.apiKeyAuthenticated) {
			throw new ORPCError('UNAUTHORIZED', {
				data: {
					message: 'API key required. Use Authorization: Bearer <api_key>',
				},
			});
		}

		const { externalId } = input;

		if (!externalId) {
			throw new ORPCError('EXTERNAL_ID_REQUIRED', {
				data: {
					message: 'externalId query parameter is required',
				},
			});
		}

		logger.debug('Request parameters', { externalId });

		try {
			// Find all subjects with this externalId
			const subjects = await db.findMany('subject', {
				where: (b) => b('externalId', '=', externalId),
			});

			// Get consents for each subject
			const subjectItems = await Promise.all(
				subjects.map(async (subject) => {
					const consents = await db.findMany('consent', {
						where: (b) => b('subjectId', '=', subject.id),
					});

					// Get the latest policy for each type
					const policyCache = new Map<string, string>();

					const consentItems = await Promise.all(
						consents.map(async (consent) => {
							let policyType = 'unknown';
							let isLatestPolicy = false;

							if (consent.policyId) {
								const policy = await registry.findConsentPolicyById(
									consent.policyId
								);
								if (policy) {
									policyType = policy.type;

									if (!policyCache.has(policyType)) {
										const policyTypeArg = policyType as
											| 'cookie_banner'
											| 'privacy_policy'
											| 'dpa'
											| 'terms_and_conditions'
											| 'marketing_communications'
											| 'age_verification'
											| 'other';
										const latestPolicy =
											await registry.findOrCreatePolicy(policyTypeArg);
										if (latestPolicy) {
											policyCache.set(policyType, latestPolicy.id);
										}
									}

									isLatestPolicy =
										policyCache.get(policyType) === consent.policyId;
								}
							}

							// Get preferences from purpose IDs
							let preferences: Record<string, boolean> | undefined;
							if (consent.purposeIds) {
								const purposeIds =
									typeof consent.purposeIds === 'object' &&
									'json' in consent.purposeIds
										? (consent.purposeIds.json as string[])
										: (consent.purposeIds as string[]);

								if (Array.isArray(purposeIds) && purposeIds.length > 0) {
									preferences = {};
									for (const purposeId of purposeIds) {
										const purpose = await db.findFirst('consentPurpose', {
											where: (b) => b('id', '=', purposeId),
										});
										if (purpose) {
											preferences[purpose.code] = true;
										}
									}
								}
							}

							return {
								id: consent.id,
								type: policyType,
								policyId: consent.policyId ?? undefined,
								isLatestPolicy,
								preferences,
								givenAt: consent.givenAt,
							};
						})
					);

					return {
						id: subject.id,
						externalId: subject.externalId ?? externalId,
						isIdentified: subject.isIdentified,
						createdAt: subject.createdAt,
						consents: consentItems,
					};
				})
			);

			logger.info('Found subjects for externalId', {
				externalId,
				count: subjectItems.length,
			});

			return {
				subjects: subjectItems,
			};
		} catch (error) {
			logger.error('Error in GET /subjects handler', {
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
