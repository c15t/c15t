/**
 * GET /subjects/:id handler - Check this device's consent status.
 *
 * @packageDocumentation
 */

import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { C15TContext } from '~/types';

/**
 * Handles retrieving a subject's consent status.
 *
 * Returns the subject's information and their consent records,
 * optionally filtered by consent type(s).
 */
export const getSubjectHandler = async (c: Context) => {
	const ctx = c.get('c15tContext') as C15TContext;
	const logger = ctx.logger;
	logger.info('Handling GET /subjects/:id request');

	const { db, registry } = ctx;

	// Get input from validated params and query
	const subjectId = c.req.param('id');
	const type = c.req.query('type');
	const typeFilter = type?.split(',').map((t) => t.trim()) || [];

	logger.debug('Request parameters', { subjectId, typeFilter });

	try {
		// Find the subject
		const subject = await db.findFirst('subject', {
			where: (b) => b('id', '=', subjectId),
		});

		if (!subject) {
			throw new HTTPException(404, {
				message: 'Subject not found',
				cause: { code: 'SUBJECT_NOT_FOUND', subjectId },
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
				? consentItems.filter((consent) => typeFilter.includes(consent.type))
				: consentItems;

		// Determine if consent is valid for requested types
		const isValid =
			typeFilter.length === 0 ||
			typeFilter.every((t) =>
				filteredConsents.some(
					(consent) => consent.type === t && consent.isLatestPolicy
				)
			);

		return c.json({
			subject: {
				id: subject.id,
				externalId: subject.externalId ?? undefined,
				isIdentified: subject.isIdentified,
				createdAt: subject.createdAt,
			},
			consents: filteredConsents,
			isValid,
		});
	} catch (error) {
		logger.error('Error in GET /subjects/:id handler', {
			error: error instanceof Error ? error.message : String(error),
			errorType: error instanceof Error ? error.constructor.name : typeof error,
		});

		if (error instanceof HTTPException) {
			throw error;
		}

		throw new HTTPException(500, {
			message: error instanceof Error ? error.message : String(error),
			cause: { code: 'INTERNAL_SERVER_ERROR' },
		});
	}
};
