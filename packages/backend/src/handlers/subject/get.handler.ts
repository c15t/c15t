/**
 * GET /subject/:id handler - Check this device's consent status.
 *
 * @packageDocumentation
 */

import { ORPCError } from '@orpc/server';
import { os } from '~/contracts';
import type { C15TContext } from '~/types';

/**
 * Handles retrieving a subject's consent status.
 *
 * Returns the subject's information and their consent records,
 * optionally filtered by consent type(s).
 */
export const getSubject = os.subject.get.handler(async ({ input, context }) => {
	const typedContext = context as C15TContext;
	const logger = typedContext.logger;
	logger.info('Handling GET /subject/:id request');

	const { db, registry } = typedContext;

	// Flat input structure: { id, type? }
	const { id: subjectId, type } = input;
	const typeFilter = type?.split(',').map((t) => t.trim()) || [];

	logger.debug('Request parameters', { subjectId, typeFilter });

	try {
		// Find the subject
		const subject = await db.findFirst('subject', {
			where: (b) => b('id', '=', subjectId),
		});

		if (!subject) {
			throw new ORPCError('SUBJECT_NOT_FOUND', {
				data: {
					subjectId,
				},
			});
		}

		// Get all consents for this subject
		const consents = await db.findMany('consent', {
			where: (b) => b('subjectId', '=', subjectId),
		});

		// Get the latest policy for each type to check isLatestPolicy
		const policyCache = new Map<string, string>();

		// Build consent items with isLatestPolicy flag
		const consentItems = await Promise.all(
			consents.map(async (consent) => {
				// Get the policy to determine type
				let policyType = 'unknown';
				let isLatestPolicy = false;

				if (consent.policyId) {
					const policy = await registry.findConsentPolicyById(consent.policyId);
					if (policy) {
						policyType = policy.type;

						// Check if this is the latest policy of this type
						if (!policyCache.has(policyType)) {
							// Cast to the expected type for findOrCreatePolicy
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

						isLatestPolicy = policyCache.get(policyType) === consent.policyId;
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

		// Filter by type if specified
		const filteredConsents =
			typeFilter.length > 0
				? consentItems.filter((c) => typeFilter.includes(c.type))
				: consentItems;

		// Determine if consent is valid for requested types
		const isValid =
			typeFilter.length === 0 ||
			typeFilter.every((type) =>
				filteredConsents.some((c) => c.type === type && c.isLatestPolicy)
			);

		return {
			subject: {
				id: subject.id,
				externalId: subject.externalId ?? undefined,
				isIdentified: subject.isIdentified,
				createdAt: subject.createdAt,
			},
			consents: filteredConsents,
			isValid,
		};
	} catch (error) {
		logger.error('Error in GET /subject/:id handler', {
			error: error instanceof Error ? error.message : String(error),
			errorType: error instanceof Error ? error.constructor.name : typeof error,
		});

		if (error instanceof ORPCError) {
			throw error;
		}

		throw new ORPCError('INTERNAL_SERVER_ERROR', {
			message: error instanceof Error ? error.message : String(error),
		});
	}
});
