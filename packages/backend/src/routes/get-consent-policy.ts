import { z } from 'zod';
import { createSDKEndpoint } from '~/pkgs/api-router';
import { DoubleTieError, ERROR_CODES } from '~/pkgs/results';
import type { C15TContext } from '~/pkgs/types';
import type { EntityOutputFields } from '~/schema/definition';

// Define the schema for the base parameters (domain is always required)
const baseParamsSchema = z.object({
	domain: z.string(),
	version: z.string().optional(),
	includePreferences: z.boolean().optional().default(true),
});

// Define schemas for the different identification methods (all optional)
const subjectIdentifierSchema = z.object({
	subjectId: z.string().optional(),
	externalId: z.string().optional(),
	ipAddress: z.string().optional(),
});

// Combine the schemas
const getPolicySchema = baseParamsSchema.merge(subjectIdentifierSchema);

export interface GetPolicyResponse {
	success: boolean;
	data: {
		policy: {
			id: string;
			domain: string;
			version: string;
			content: string;
			availablePreferences?: Record<string, unknown>;
			createdAt: string;
		};
		subjectConsentStatus?: {
			hasConsent: boolean;
			currentPreferences: Record<string, string | null> | null;
			consentedAt: string | null;
			needsRenewal: boolean;
			identifiedBy: string | null;
		};
	};
}

/**
 * Endpoint for retrieving consent policy information.
 *
 * This endpoint allows clients to retrieve the consent policy for a domain.
 * It supports retrieving the latest policy or a specific version.
 * It can also return personalized policy information if subject identifiers are provided.
 *
 * @endpoint GET /consent/policy
 * @requestExample
 * ```
 * // Basic policy request
 * GET /api/consent/policy?domain=example.com
 * ```
 *
 * @requestExample
 * ```
 * // Specific version
 * GET /api/consent/policy?domain=example.com&version=1.2
 * ```
 *
 * @requestExample
 * ```
 * // With subject context
 * GET /api/consent/policy?domain=example.com&subjectId=550e8400-e29b-41d4-a716-446655440000
 * ```
 *
 * @responseExample
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "policy": {
 *       "id": 1,
 *       "domain": "example.com",
 *       "version": "1.0",
 *       "content": {
 *         "title": "Privacy Policy",
 *         "description": "How we use your data",
 *         "lastUpdated": "2023-04-01"
 *       },
 *       "availablePreferences": {
 *         "marketing": {
 *           "title": "Marketing",
 *           "description": "Allow us to send you marketing communications",
 *           "default": false
 *         },
 *         "analytics": {
 *           "title": "Analytics",
 *           "description": "Allow us to collect usage data to improve our service",
 *           "default": true
 *         }
 *       },
 *       "createdAt": "2023-04-01T12:34:56.789Z"
 *     },
 *     "subjectConsentStatus": {
 *       "hasConsent": true,
 *       "currentPreferences": {
 *         "marketing": null,
 *         "analytics": "2023-04-02T10:30:00.000Z"
 *       },
 *       "consentedAt": "2023-04-02T10:30:00.000Z",
 *       "needsRenewal": false
 *     }
 *   }
 * }
 * ```
 *
 * @returns {Object} Result of getting policy
 * @returns {boolean} success - Whether the request was successful
 * @returns {Object} data - The policy data
 * @returns {Object} data.policy - The consent policy information
 * @returns {Object} [data.subjectConsentStatus] - Subject's consent status if subject identifiers were provided
 *
 * @throws {DoubleTieError} BAD_REQUEST - When request parameters are invalid
 * @throws {DoubleTieError} NOT_FOUND - When the domain or policy version doesn't exist
 */
export const getConsentPolicy = createSDKEndpoint(
	'/consent/policy',
	{
		method: 'GET',
		query: getPolicySchema,
	},
	async (ctx) => {
		try {
			const validatedData = getPolicySchema.safeParse(ctx.query);

			if (!validatedData.success) {
				throw new DoubleTieError('BAD_REQUEST', {
					code: ERROR_CODES.BAD_REQUEST,
					status: 400,
					data: {
						message: 'Invalid request data',
						details: validatedData.error.errors,
					},
				});
			}

			const params = validatedData.data;
			const { registry } = ctx.context as C15TContext;

			if (!registry) {
				throw new DoubleTieError('INTERNAL_SERVER_ERROR', {
					code: ERROR_CODES.INTERNAL_SERVER_ERROR,
					status: 503,
					data: {
						message: 'Registry not available',
					},
				});
			}

			// Find domain
			let domain: EntityOutputFields<'domain'> | null = null;
			try {
				if (registry.findDomain) {
					domain = await registry.findDomain(params.domain);
				}
			} catch {
				throw new DoubleTieError(
					'The specified domain could not be found. Please verify the domain name and try again.',
					{
						code: ERROR_CODES.NOT_FOUND,
						status: 404,
						data: {
							domain: params.domain,
						},
					}
				);
			}

			if (!domain) {
				throw new DoubleTieError(
					'The specified domain could not be found. Please verify the domain name and try again.',
					{
						code: ERROR_CODES.NOT_FOUND,
						status: 404,
						data: {
							domain: params.domain,
						},
					}
				);
			}

			// Find the policy
			let policy: EntityOutputFields<'consentPolicy'> | null = null;
			try {
				if (registry.findPolicy) {
					policy = await registry.findPolicy(domain.id, params.version);
				}
			} catch {
				throw new DoubleTieError(
					params.version
						? `The specified policy version ${params.version} for domain ${params.domain} could not be found. Please verify the version number and domain name, and try again.`
						: `No policy could be found for the domain ${params.domain}. Please ensure the domain name is correct and try again.`,
					{
						code: ERROR_CODES.NOT_FOUND,
						status: 404,
						data: {
							domain: params.domain,
							version: params.version,
						},
					}
				);
			}

			if (!policy) {
				throw new DoubleTieError(
					params.version
						? `The specified policy version ${params.version} for domain ${params.domain} could not be found. Please verify the version number and domain name, and try again.`
						: `No policy could be found for the domain ${params.domain}. Please ensure the domain name is correct and try again.`,
					{
						code: ERROR_CODES.NOT_FOUND,
						status: 404,
						data: {
							domain: params.domain,
							version: params.version,
						},
					}
				);
			}

			// Format basic response
			const response: GetPolicyResponse = {
				success: true,
				data: {
					policy: {
						id: policy.id,
						domain: params.domain,
						version: policy.version,
						content: policy.content,
						availablePreferences: params.includePreferences
							? //@ts-expect-error
								policy.availablePreferences
							: undefined,
						createdAt: policy.createdAt.toISOString(),
					},
				},
			};

			// If subject identifiers were provided, try to find the subject's consent status
			if (params.subjectId || params.externalId || params.ipAddress) {
				let subjectRecord: EntityOutputFields<'subject'> | null = null;
				let identifierUsed: string | null = null;

				// Try to find subject by subjectId
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

				// If we found a subject, get their consent status
				if (subjectRecord) {
					// Get subject's active consents for this domain
					const subjectConsents = await registry.findConsents({
						subjectId: subjectRecord.id,
						domainId: domain.id,
						status: 'active',
					});

					// Get the latest active consent
					const subjectConsent =
						subjectConsents.length > 0 ? subjectConsents[0] : null;

					// Add subject consent info to response
					response.data.subjectConsentStatus = {
						hasConsent: !!subjectConsent,
						currentPreferences: subjectConsent
							? // @ts-expect-error
								subjectConsent.preferences
							: null,
						consentedAt: subjectConsent
							? subjectConsent.givenAt.toISOString() || null
							: null,
						needsRenewal: subjectConsent
							? subjectConsent.policyId !== policy.id
							: true,
						identifiedBy: identifierUsed,
					};
				}
			}

			return response;
		} catch (error) {
			const context = ctx.context as C15TContext;
			context.logger?.error?.('Error getting consent policy:', error);

			if (error instanceof DoubleTieError) {
				throw error;
			}
			if (error instanceof z.ZodError) {
				throw new DoubleTieError('BAD_REQUEST', {
					code: ERROR_CODES.BAD_REQUEST,
					status: 400,
					data: {
						message: 'Invalid request data',
						details: error.errors,
					},
				});
			}

			throw new DoubleTieError('INTERNAL_SERVER_ERROR', {
				code: ERROR_CODES.INTERNAL_SERVER_ERROR,
				status: 503,
				data: {
					message: 'Failed to get consent policy',
					details:
						error instanceof Error ? { message: error.message } : { error },
				},
			});
		}
	}
);
