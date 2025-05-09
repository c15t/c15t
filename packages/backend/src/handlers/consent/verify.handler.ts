import { ORPCError } from '@orpc/server';
import type { z } from 'zod';
import { os } from '~/contracts';
import type { Consent as DBConsent } from '~/schema/consent';
import type { PolicyTypeSchema } from '~/schema/consent-policy';
import type { C15TContext } from '~/types';

/**
 * Type representing a consent record with required fields
 */
interface Consent {
	id: string;
	purposeIds: string[];
	[key: string]: unknown;
}

/**
 * Input type for verifying consent
 */
type VerifyConsentInput = {
	subjectId?: string;
	externalSubjectId?: string;
	domain: string;
	type: z.infer<typeof PolicyTypeSchema>;
	policyId?: string;
	preferences?: string[];
};

/**
 * Response type for consent verification
 */
type VerifyConsentOutput = {
	isValid: boolean;
	reasons?: string[];
	consent?: Consent;
};

/**
 * Parameters for checking policy consent
 */
interface PolicyConsentCheckParams {
	policyId: string;
	subjectId: string;
	domainId: string;
	purposeIds?: string[];
	type: z.infer<typeof PolicyTypeSchema>;
	context: C15TContext;
}

/**
 * Handles verification of consent records.
 *
 * This handler checks if a subject has given valid consent for a specific policy
 * and domain, optionally verifying specific purpose preferences.
 *
 * @throws {DoubleTieError} When:
 * - Subject creation fails
 * - Domain is not found
 * - Policy is not found or invalid
 * - Database query fails
 *
 * @example
 * ```ts
 * // Verify cookie banner consent
 * const response = await verifyConsent({
 *   type: 'cookie_banner',
 *   domain: 'example.com',
 *   preferences: ['analytics', 'marketing']
 * });
 * ```
 */
export const verifyConsent = os.consent.verify.handler(
	async ({ input, context }) => {
		const typedContext = context as C15TContext;
		const logger = typedContext.logger;
		logger.info('Handling verify-consent request');

		const {
			type,
			subjectId,
			externalSubjectId,
			domain,
			policyId,
			preferences,
		} = input as VerifyConsentInput;

		logger.debug('Request parameters', {
			type,
			subjectId,
			externalSubjectId,
			domain,
			policyId,
			preferences,
		});

		try {
			// Find subject
			const subject = await typedContext.registry.findOrCreateSubject({
				subjectId,
				externalSubjectId,
				ipAddress: typedContext.ipAddress || 'unknown',
			});

			if (!subject) {
				throw new ORPCError('SUBJECT_NOT_FOUND', {
					data: {
						subjectId,
						externalSubjectId,
					},
				});
			}

			// Find domain
			const domainRecord = await typedContext.registry.findDomain(domain);
			if (!domainRecord) {
				throw new ORPCError('DOMAIN_NOT_FOUND', {
					data: {
						domain,
					},
				});
			}

			// Validate preferences for cookie banner
			if (
				type === 'cookie_banner' &&
				(!preferences || preferences.length === 0)
			) {
				throw new ORPCError('COOKIE_BANNER_PREFERENCES_REQUIRED', {
					data: {
						type: 'cookie_banner',
					},
				});
			}

			// Find purpose IDs if preferences are provided
			const purposePromises = preferences?.map((purpose: string) =>
				typedContext.registry.findConsentPurposeByCode(purpose)
			);

			const rawPurposes = await Promise.all(purposePromises ?? []);
			const purposeIds = rawPurposes
				.filter(
					(purpose): purpose is NonNullable<typeof purpose> => purpose !== null
				)
				.map((purpose) => purpose.id);

			if (purposeIds.length !== (preferences?.length ?? 0)) {
				throw new ORPCError('PURPOSES_NOT_FOUND', {
					data: {
						preferences: preferences ?? [],
						foundPurposes: rawPurposes
							.filter((p): p is NonNullable<typeof p> => p !== null)
							.map((p) => p.code),
					},
				});
			}

			// Check policy consent
			if (policyId) {
				const policy =
					await typedContext.registry.findConsentPolicyById(policyId);
				if (!policy || policy.type !== type) {
					throw new ORPCError('POLICY_NOT_FOUND', {
						data: {
							policyId,
							type,
						},
					});
				}

				return await checkPolicyConsent({
					policyId: policy.id,
					subjectId: subject.id,
					domainId: domainRecord.id,
					purposeIds,
					type,
					context: typedContext,
				});
			}

			// Check latest policy consent
			const latestPolicy = await typedContext.registry.findOrCreatePolicy(type);
			if (!latestPolicy) {
				throw new ORPCError('POLICY_NOT_FOUND', {
					data: {
						policyId: 'latest',
						type,
					},
				});
			}

			return await checkPolicyConsent({
				policyId: latestPolicy.id,
				subjectId: subject.id,
				domainId: domainRecord.id,
				purposeIds,
				type,
				context: typedContext,
			});
		} catch (error) {
			logger.error('Error in verify-consent handler', {
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

/**
 * Checks if consent has been given for a specific policy.
 *
 * @param params - Parameters for checking policy consent
 * @returns Verification result with consent details if valid
 *
 * @throws {DoubleTieError} When database operations fail
 */
async function checkPolicyConsent({
	policyId,
	subjectId,
	domainId,
	purposeIds,
	type,
	context,
}: PolicyConsentCheckParams): Promise<VerifyConsentOutput> {
	const { registry, adapter } = context;

	// Find all consents for the policy
	const rawConsents = (await adapter.findMany({
		model: 'consent',
		where: [
			{ field: 'subjectId', value: subjectId },
			{ field: 'policyId', value: policyId },
			{ field: 'domainId', value: domainId },
		],
		sortBy: {
			field: 'givenAt',
			direction: 'desc',
		},
	})) as unknown as DBConsent[];

	// Filter consents by purpose IDs if provided
	const filteredConsents = rawConsents.filter((consent) => {
		if (!purposeIds) {
			return true;
		}
		return purposeIds.every((id) =>
			(consent.purposeIds as string[]).some((purposeId) => purposeId === id)
		);
	});

	// Create audit log
	await registry.createAuditLog({
		subjectId,
		entityType: 'consent_policy',
		entityId: policyId,
		actionType: 'verify_consent',
		metadata: {
			type,
			policyId,
			purposeIds,
			success: filteredConsents.length !== 0,
			...(filteredConsents.length > 0
				? {
						consentId: filteredConsents[0]?.id,
					}
				: {}),
		},
	});

	if (rawConsents.length === 0) {
		throw new ORPCError('NO_CONSENT_FOUND', {
			data: {
				policyId,
				subjectId,
				domainId,
			},
		});
	}

	if (filteredConsents.length === 0) {
		throw new ORPCError('NO_CONSENT_FOUND', {
			data: {
				policyId,
				subjectId,
				domainId,
			},
		});
	}

	return {
		isValid: true,
		consent: filteredConsents[0],
	};
}
