import type { z } from 'zod';
import { os } from '~/contracts';
import {} from '~/pkgs/results';
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
				return {
					isValid: false,
					reasons: ['Subject not found'],
				};
			}

			// Find domain
			const domainRecord = await typedContext.registry.findDomain(domain);
			if (!domainRecord) {
				return {
					isValid: false,
					reasons: ['Domain not found'],
				};
			}

			// Validate preferences for cookie banner
			if (type === 'cookie_banner' && preferences?.length === 0) {
				return {
					isValid: false,
					reasons: ['Preferences are required'],
				};
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
				return {
					isValid: false,
					reasons: ['Could not find all purposes'],
				};
			}

			// Check policy consent
			if (policyId) {
				const policy =
					await typedContext.registry.findConsentPolicyById(policyId);
				if (!policy || policy.type !== type) {
					return {
						isValid: false,
						reasons: ['Policy not found'],
					};
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
				return {
					isValid: false,
					reasons: ['Failed to find or create latest policy'],
				};
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

			throw error;
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
			consentId: filteredConsents[0]?.id,
		},
	});

	if (rawConsents.length === 0) {
		return {
			isValid: false,
			reasons: ['No consent found for the given policy'],
		};
	}

	return {
		isValid: true,
		consent: filteredConsents[0],
	};
}
