import { z } from 'zod';
import { C15T_ERROR_CODES } from '~/error-codes';
import { createSDKEndpoint } from '~/pkgs/api-router';
import { DoubleTieError, ERROR_CODES } from '~/pkgs/results';
import { PolicyTypeSchema } from '~/schema/consent-policy';
import { validateEntityOutput } from '~/schema/definition';
import type { C15TContext } from '~/types';

// Base schema
const verifyConsentSchema = z.object({
	subjectId: z.string().optional(),
	externalSubjectId: z.string().optional(),
	domain: z.string(),
	type: PolicyTypeSchema,
	policyId: z.string().optional(),
	preferences: z.string().optional(), // Needs to be parsed,
});

export interface VerifyConsentResponse {
	isValid: boolean;
	reasons?: string[];
}

export type VerifyConsentRequest = z.infer<typeof verifyConsentSchema>;

/**
 * Endpoint for verifying existing consent records.
 *
 * This endpoint checks if valid consent exists for a given subject, domain, and consent type.
 * It can also verify specific purposes for cookie banner consent and policy versions for policy-based consent.
 *
 * @endpoint POST /consents/verify
 * @requestExample
 * ```json
 * // Verify Cookie Banner Consent
 * {
 *   "type": "cookie_banner",
 *   "domain": "example.com",
 *   "subjectId": "sub_x1pftyoufsm7xgo1kv",
 *   "purposeCodes": ["marketing", "analytics"]
 * }
 *
 * // Verify Privacy Policy Consent
 * {
 *   "type": "privacy_policy",
 *   "domain": "example.com",
 *   "subjectId": "sub_x1pftyoufsm7xgo1kv",
 *   "policyId": "pol_xyz789"
 * }
 * ```
 *
 * @returns {VerifyConsentResponse} Object containing verification result and consent details
 * @throws {DoubleTieError} When verification fails due to invalid parameters or server error
 */
export const verifyConsent = createSDKEndpoint(
	'/consent/verify',
	{
		method: 'POST',
		body: verifyConsentSchema,
	},
	async ({ context, body }) => {
		try {
			const { type, subjectId, externalSubjectId, domain, policyId } = body;
			const { registry, adapter } = context as C15TContext;

			// Find subject
			const subject = await registry.findOrCreateSubject({
				subjectId,
				externalSubjectId,
				ipAddress: context.ipAddress || 'unknown',
			});

			if (!subject) {
				return {
					isValid: false,
					reasons: ['Subject not found'],
				};
			}

			// Find domain
			const domainRecord = await registry.findDomain(domain);
			if (!domainRecord) {
				return {
					isValid: false,
					reasons: ['Domain not found'],
				};
			}

			async function policyConsentGiven({
				policyId,
				subjectId,
				domainId,
				purposeIds,
			}: {
				policyId: string;
				subjectId: string;
				domainId: string;
				purposeIds?: string[];
			}) {
				const rawConsents = await adapter.findMany({
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
				});

				const consents = rawConsents.map((consent) =>
					validateEntityOutput('consent', consent, context.options)
				);

				const filteredConsents = consents.filter((consent) => {
					if (!purposeIds) {
						return true;
					}

					return purposeIds.every((id) =>
						(consent.purposeIds as unknown as string[]).some(
							(purposeId) => purposeId === id
						)
					);
				});

				await registry.createAuditLog({
					subjectId: subjectId,
					entityType: 'consent_policy',
					entityId: policyId,
					actionType: 'verify_consent',
					metadata: {
						type,
						policyId: policyId,
						purposeIds,
						success: filteredConsents.length !== 0,
						consentId: filteredConsents[0]?.id,
					},
				});

				if (consents.length === 0) {
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

			// Parse preferences
			const preferences = JSON.parse(
				body.preferences?.replace(/'/g, '"') || '[]'
			) as string[];

			if (type === 'cookie_banner' && preferences.length === 0) {
				return {
					isValid: false,
					reasons: ['Preferences are required'],
				};
			}

			const purposePromises = preferences.map((purpose: string) =>
				registry.findConsentPurposeByCode(purpose)
			);

			const rawPurposes = await Promise.all(purposePromises);

			// Filter out any undefined purposes and get their IDs
			const purposeIds = rawPurposes
				.filter(
					(purpose): purpose is NonNullable<typeof purpose> => purpose !== null
				)
				.map((purpose) => purpose.id);

			if (purposeIds.length !== preferences.length) {
				return {
					isValid: false,
					reasons: ['Could not find all purposes'],
				};
			}

			// Check if the user has consented to the specific policy
			if (policyId) {
				const policy = await registry.findConsentPolicyById(policyId);
				if (!policy || policy.type !== type) {
					return {
						isValid: false,
						reasons: ['Policy not found'],
					};
				}

				return await policyConsentGiven({
					policyId: policy.id,
					subjectId: subject.id,
					domainId: domainRecord.id,
				});
			}

			// Check if the user has consented to the latest policy if no policyId is provided
			const latestPolicy = await registry.findOrCreatePolicy(type);

			if (!latestPolicy) {
				return {
					isValid: false,
					reasons: ['Failed to find or create latest policy'],
				};
			}

			return await policyConsentGiven({
				policyId: latestPolicy.id,
				subjectId: subject.id,
				domainId: domainRecord.id,
			});
		} catch (error) {
			context.logger?.error?.(
				'[verifyConsent] Error verifying consent:',
				error
			);

			if (error instanceof z.ZodError) {
				context.logger?.error?.(
					'[verifyConsent] Zod error:',
					JSON.stringify(error.issues)
				);
			}

			if (error instanceof DoubleTieError) {
				throw error;
			}

			if (error instanceof z.ZodError) {
				throw new DoubleTieError(
					'The verification request data is invalid. Please ensure all required fields are correctly filled and formatted.',
					{
						code: ERROR_CODES.BAD_REQUEST,
						status: 400,
						data: {
							details: error.errors.map((issue) => issue.message),
						},
					}
				);
			}

			throw new DoubleTieError(
				'Failed to verify consent. Please try again later or contact support if the issue persists.',
				{
					code: C15T_ERROR_CODES.FAILED_TO_GET_CONSENT,
					status: 500,
					data: {
						error: error instanceof Error ? error.message : String(error),
					},
				}
			);
		}
	}
);
