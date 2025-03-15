import { z } from 'zod';
import { createAuthEndpoint } from '~/pkgs/api-router';
import { DoubleTieError, ERROR_CODES } from '~/pkgs/results';
import type { C15TContext } from '~/pkgs/types';
import type { EntityOutputFields } from '~/schema/definition';

// Schema for the base verification criteria (at least domain is required)
const baseVerificationSchema = z.object({
	domain: z.string(),
	requiredPreferences: z.record(z.string().datetime().nullable()).optional(),
	requireExactMatch: z.boolean().optional().default(false),
	policyVersion: z.string().optional(),
});

// Define schemas for the different identification methods
// At least one identifier must be provided
const identifierSchema = z
	.object({
		subjectId: z.string().optional(),
		externalId: z.string().optional(),
		ipAddress: z.string().optional(),
	})
	.refine(
		(data) =>
			data.subjectId !== undefined ||
			data.externalId !== undefined ||
			data.ipAddress !== undefined,
		{
			message:
				'At least one identifier (subjectId, externalId, or ipAddress) must be provided',
		}
	);

// Combine the schemas
const verifyConsentSchema = baseVerificationSchema.and(identifierSchema);

export interface VerifyConsentResponse {
	success: boolean;
	data: {
		verified: boolean;
		consentDetails: {
			id: string;
			givenAt: string;
			policyVersion: string;
			preferences: Record<string, string | null>;
		} | null;
		identifiedBy: string | null;
		verificationResults: {
			hasActiveConsent: boolean;
			meetsPreferenceRequirements: boolean;
			matchesPolicyVersion: boolean;
		};
	};
}

/**
 * Endpoint for verifying if a subject has given consent.
 *
 * This endpoint allows checking if a subject has provided consent for a specific domain
 * and verifies if the consent meets specific criteria (required preferences, policy version).
 * Subjects can be identified by subjectId, externalId, or ipAddress.
 *
 * @endpoint GET /consent/verify
 */
export const verifyConsent = createAuthEndpoint(
	'/consent/verify',
	{
		method: 'GET',
		query: verifyConsentSchema,
	},
	async (ctx) => {
		try {
			const validatedData = verifyConsentSchema.safeParse(ctx.query);

			if (!validatedData.success) {
				throw new DoubleTieError(
					'The request data is invalid. Please ensure all required fields are correctly filled and formatted.',
					{
						code: ERROR_CODES.BAD_REQUEST,
						status: 400,
						data: {
							details: validatedData.error.errors,
						},
					}
				);
			}

			const params = validatedData.data;
			const { registry } = ctx.context as C15TContext;

			if (!registry) {
				throw new DoubleTieError(
					'The registry service is currently unavailable. Please check the service status and try again later.',
					{
						code: ERROR_CODES.INITIALIZATION_FAILED,
						status: 503,
					}
				);
			}

			// Find subject based on provided identifiers
			let subjectRecord: EntityOutputFields<'subject'> | null = null;
			let identifierUsed: string | null = null;

			// Try to find subject by subjectId (most precise)
			if (params.subjectId) {
				subjectRecord = await registry.findSubjectById(params.subjectId);
				if (subjectRecord) {
					identifierUsed = 'subjectId';
				}
			}

			// If not found and externalId provided, try that
			if (!subjectRecord && params.externalId) {
				subjectRecord = await registry.findSubjectByExternalId(
					params.externalId
				);
				if (subjectRecord) {
					identifierUsed = 'externalId';
				}
			}

			// If no subject found, return negative verification
			if (!subjectRecord) {
				return {
					success: true,
					data: {
						verified: false,
						consentDetails: null,
						identifiedBy: null,
						verificationResults: {
							hasActiveConsent: false,
							meetsPreferenceRequirements: false,
							matchesPolicyVersion: false,
						},
					},
				};
			}

			// Find active consents for this subject
			const subjectConsents = await registry.findConsents({
				subjectId: subjectRecord.id,
			});

			// Filter for active consents that match the domain
			const activeConsents = subjectConsents.filter(
				(consent) =>
					consent.status === 'active' && consent.domainId === params.domain
			);

			// Sort consents by givenAt date, most recent first
			activeConsents.sort(
				(a, b) => new Date(b.givenAt).getTime() - new Date(a.givenAt).getTime()
			);

			// Get the most recent active consent for this domain, if any
			const record = activeConsents.length > 0 ? activeConsents[0] : null;

			// If no consent found, return negative verification
			if (!record) {
				return {
					success: true,
					data: {
						verified: false,
						consentDetails: null,
						identifiedBy: identifierUsed,
						verificationResults: {
							hasActiveConsent: false,
							meetsPreferenceRequirements: false,
							matchesPolicyVersion: false,
						},
					},
				};
			}

			// Verify consent meets criteria if specified
			let meetsPreferenceRequirements = true;
			if (params.requiredPreferences) {
				const preferences =
					(record.metadata as Record<string, unknown>)?.preferences || {};

				// Check if all required preferences are present and have the correct values
				for (const [key, requiredValue] of Object.entries(
					params.requiredPreferences
				)) {
					//@ts-expect-error
					const hasPreference = key in preferences;
					//@ts-expect-error
					const preferenceEnabled = hasPreference && preferences[key] !== null;

					if (params.requireExactMatch) {
						// Exact match requires preference to exist and match value exactly
						if (
							!hasPreference ||
							preferenceEnabled !== (requiredValue !== null)
						) {
							meetsPreferenceRequirements = false;
							break;
						}
					} else if (requiredValue !== null && !preferenceEnabled) {
						// Non-exact match only checks if required trues are true
						meetsPreferenceRequirements = false;
						break;
					}
				}
			}

			// Verify policy version if specified
			const matchesPolicyVersion = params.policyVersion
				? record.policyId === params.policyVersion
				: true;

			// Determine overall verification result
			const verified =
				record.status === 'active' &&
				meetsPreferenceRequirements &&
				matchesPolicyVersion;

			// Return verification result
			return {
				success: true,
				data: {
					verified,
					consentDetails: {
						id: record.id,
						givenAt: record.givenAt.toISOString(),
						policyVersion: record.policyId || '',
						preferences:
							(record.metadata as Record<string, unknown>)?.preferences || {},
					},
					identifiedBy: identifierUsed,
					verificationResults: {
						hasActiveConsent: record.status === 'active',
						meetsPreferenceRequirements,
						matchesPolicyVersion,
					},
				},
			};
		} catch (error) {
			const context = ctx.context as C15TContext;
			context.logger?.error?.('Error verifying consent:', error);

			if (error instanceof DoubleTieError) {
				throw error;
			}
			if (error instanceof z.ZodError) {
				throw new DoubleTieError(
					'The request data is invalid. Please ensure all required fields are correctly filled and formatted.',
					{
						code: ERROR_CODES.BAD_REQUEST,
						status: 400,
						data: {
							details: error.errors,
						},
					}
				);
			}

			throw new DoubleTieError(
				'Failed to verify consent. Please try again later or contact support if the issue persists.',
				{
					code: ERROR_CODES.INTERNAL_SERVER_ERROR,
					status: 503,
					data: {
						details:
							error instanceof Error ? { message: error.message } : { error },
					},
				}
			);
		}
	}
);
