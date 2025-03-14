import { z } from 'zod';
import type { EntityOutputFields } from '~/db/schema/definition';
import { BASE_ERROR_CODES, C15TError } from '~/pkgs/errors';
import type { C15TContext } from '../../types';
import { createAuthEndpoint } from '../call';

// Define schemas for the different identification methods
const getBySubjectIdSchema = z.object({
	subjectId: z.string(),
	domain: z.string().optional(),
	identifierType: z.literal('subjectId'),
});

const getByExternalIdSchema = z.object({
	externalId: z.string(),
	domain: z.string().optional(),
	identifierType: z.literal('externalId'),
});

const getByIpAddressSchema = z.object({
	ipAddress: z.string(),
	domain: z.string(),
	identifierType: z.literal('ipAddress'),
});

// Combined schema using discriminated union
const getConsentSchema = z.discriminatedUnion('identifierType', [
	getBySubjectIdSchema,
	getByExternalIdSchema,
	getByIpAddressSchema,
]);

export interface GetConsentResponse {
	success: boolean;
	data: {
		hasActiveConsent: boolean;
		records: Array<{
			id: string;
			subjectId: string;
			domain: string;
			status: string;
			givenAt: string;
			policyId: string;
			preferences: Record<string, string | null>;
		}>;
		identifiedBy: string | null;
	};
}

/**
 * Endpoint for retrieving active consent records.
 *
 * This endpoint allows clients to retrieve a subject's active consent records by specifying:
 * 1. The subject ID (internal UUID) and an optional domain
 * 2. The external ID and an optional domain
 * 3. The IP address and a required domain (since IP alone is too broad)
 *
 * @endpoint GET /consent/get
 */
export const getConsent = createAuthEndpoint(
	'/consent/get',
	{
		method: 'GET',
		query: getConsentSchema,
	},
	async (ctx) => {
		try {
			const validatedData = getConsentSchema.safeParse(ctx.query);

			if (!validatedData.success) {
				throw new C15TError(
					'The request data is invalid. Please ensure all required fields are correctly filled and formatted.',
					{
						code: BASE_ERROR_CODES.BAD_REQUEST,
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
				throw new C15TError(
					'The registry service is currently unavailable. Please check the service status and try again later.',
					{
						code: BASE_ERROR_CODES.INITIALIZATION_FAILED,
						status: 503,
					}
				);
			}

			// Find subject based on identifier type
			let subjects: EntityOutputFields<'subject'>[] = [];

			// biome-ignore lint/style/useDefaultSwitchClause: <explanation>
			switch (params.identifierType) {
				case 'subjectId': {
					const subjectRecord = await registry.findSubjectById(
						params.subjectId
					);
					if (subjectRecord) {
						subjects = [subjectRecord];
					}
					break;
				}
				case 'externalId': {
					const externalSubject = await registry.findSubjectByExternalId(
						params.externalId
					);
					if (externalSubject) {
						subjects = [externalSubject];
					}
					break;
				}
				case 'ipAddress': {
					// For IP address lookups, we require a domain
					if (!params.domain) {
						throw new C15TError(
							'A domain must be specified when using an IP address for identification. Please include a valid domain in your request.',
							{
								code: BASE_ERROR_CODES.MISSING_REQUIRED_PARAMETER,
								status: 400,
								data: {
									ipAddress: params.ipAddress,
								},
							}
						);
					}

					// This is a simplification - in a real implementation, we would need
					// a method to look up subjects by IP address, possibly by scanning recent consent records
					// For now, we'll use an empty array as this would require a custom query
					subjects = [];
					break;
				}
			}

			if (subjects.length === 0) {
				return {
					success: true,
					data: {
						hasActiveConsent: false,
						records: [],
						identifiedBy: params.identifierType,
					},
				};
			}

			// Get active consent records for these subjects
			const consentResults: Array<{
				id: string;
				subjectId: string;
				domain: string;
				status: string;
				givenAt: string;
			}> = [];

			for (const subject of subjects) {
				// Use the adapter to find subject consents
				const subjectConsents = await registry.findConsents({
					subjectId: subject.id,
					domainId: params.domain,
				});

				// Filter for active consents only
				const activeConsents = subjectConsents.filter(
					(consent) => consent.status === 'active'
				);

				// Include subject identification in the results
				for (const consent of activeConsents) {
					consentResults.push({
						id: consent.id,
						subjectId: subject.id,
						// domain: consent.domainId,
						// status: consent.status,
						givenAt: consent.givenAt.toISOString(),
						// policyId: consent.policyId || '',
						//@ts-expect-error
						preferences: consent.preferences || {},
					});
				}
			}

			return {
				success: true,
				data: {
					hasActiveConsent: consentResults.length > 0,
					records: consentResults,
					identifiedBy: params.identifierType,
				},
			};
		} catch (error) {
			const context = ctx.context as C15TContext;
			context.logger?.error?.('Error getting consent:', error);

			if (error instanceof C15TError) {
				throw error;
			}
			if (error instanceof z.ZodError) {
				throw new C15TError(
					'The request data is invalid. Please ensure all required fields are correctly filled and formatted.',
					{
						code: BASE_ERROR_CODES.BAD_REQUEST,
						status: 400,
						data: {
							details: error.errors,
						},
					}
				);
			}

			throw new C15TError(
				'Failed to retrieve consent information. Please try again later or contact support if the issue persists.',
				{
					code: BASE_ERROR_CODES.FAILED_TO_GET_CONSENT,
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
