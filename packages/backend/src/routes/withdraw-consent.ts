import { z } from 'zod';
import { C15T_ERROR_CODES } from '~/error-codes';
import { createSDKEndpoint } from '~/pkgs/api-router';
import { DoubleTieError, ERROR_CODES } from '~/pkgs/results';
import type { C15TContext } from '~/pkgs/types';
import type { EntityOutputFields } from '~/schema/definition';

// Define the schemas for validating request body
// We'll have three different schemas for the three identification methods
const withdrawByConsentIdSchema = z.object({
	consentId: z.string(),
	identifierType: z.literal('consentId'),
	reason: z.string().optional(),
	method: z.string().min(1).max(50),
	actor: z.string().optional(),
	metadata: z.record(z.any()).optional(),
});

const withdrawBySubjectIdSchema = z.object({
	subjectId: z.string(),
	domain: z.string(),
	identifierType: z.literal('subjectId'),
	reason: z.string().optional(),
	method: z.string().min(1).max(50),
	actor: z.string().optional(),
	metadata: z.record(z.any()).optional(),
});

const withdrawByExternalIdSchema = z.object({
	externalId: z.string(),
	domain: z.string(),
	identifierType: z.literal('externalId'),
	reason: z.string().optional(),
	method: z.string().min(1).max(50),
	actor: z.string().optional(),
	metadata: z.record(z.any()).optional(),
});

// Combined schema using discriminated union
const withdrawConsentSchema = z.discriminatedUnion('identifierType', [
	withdrawByConsentIdSchema,
	withdrawBySubjectIdSchema,
	withdrawByExternalIdSchema,
]);

export interface WithdrawConsentResponse {
	success: boolean;
	data: {
		withdrawalIds: string[];
		consentIds: string[];
		revokedAt: string;
	};
}

/**
 * Endpoint for withdrawing previously given consent.
 *
 * This endpoint allows clients to revoke a subject's consent by specifying either:
 * 1. The specific consent ID to withdraw
 * 2. The subject ID and domain to withdraw all active consents for that subject on that domain
 * 3. The external subject ID and domain to withdraw all active consents for that subject on that domain
 *
 * @endpoint POST /consent/withdraw
 */
export const withdrawConsent = createSDKEndpoint(
	'/consent/withdraw',
	{
		method: 'POST',
		body: withdrawConsentSchema,
	},
	async (ctx) => {
		try {
			const validatedData = withdrawConsentSchema.safeParse(ctx.body);

			if (!validatedData.success) {
				throw new DoubleTieError(
					'The request data is invalid. Please ensure all required fields are correctly filled and formatted.',
					{
						code: ERROR_CODES.BAD_REQUEST,
						status: 400,
						data: { details: validatedData.error.errors },
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

			// Find the consent records to withdraw based on the identifier type
			let recordsToWithdraw: EntityOutputFields<'consent'>[] = [];

			if (params.identifierType === 'consentId') {
				// Find by consent ID
				const record = await registry.findConsentById(params.consentId);

				if (!record) {
					throw new DoubleTieError(
						'The specified consent record could not be found. Please verify the consent ID and try again.',
						{
							code: C15T_ERROR_CODES.CONSENT_NOT_FOUND,
							status: 404,
							data: { consentId: params.consentId },
						}
					);
				}

				if (record.status !== 'active') {
					throw new DoubleTieError(
						'The consent has already been withdrawn. No further action is required.',
						{
							code: ERROR_CODES.CONFLICT,
							status: 409,
							data: {
								consentId: params.consentId,
								currentStatus: record.status,
							},
						}
					);
				}

				recordsToWithdraw = [record];
			} else if (
				params.identifierType === 'subjectId' ||
				params.identifierType === 'externalId'
			) {
				// Find subject
				let subjectRecord: EntityOutputFields<'subject'> | null = null;
				if (params.identifierType === 'subjectId') {
					subjectRecord = await registry.findSubjectById(params.subjectId);
				} else {
					subjectRecord = await registry.findSubjectByExternalId(
						params.externalId
					);
				}

				if (!subjectRecord) {
					throw new DoubleTieError(
						'The specified subject could not be found. Please verify the subject ID or external ID and try again.',
						{
							code: ERROR_CODES.NOT_FOUND,
							status: 404,
							data:
								params.identifierType === 'subjectId'
									? { subjectId: params.subjectId }
									: { externalId: params.externalId },
						}
					);
				}

				// Find all active consents for this subject and domain
				const subjectConsents = await registry.findConsents({
					subjectId: subjectRecord.id,
				});

				// Filter for active consents with matching domain
				recordsToWithdraw = subjectConsents.filter(
					(consent) =>
						consent.status === 'active' && consent.domainId === params.domain
				);

				if (recordsToWithdraw.length === 0) {
					throw new DoubleTieError(
						'No active consent records were found for this subject and domain. Please ensure the subject and domain are correct.',
						{
							code: C15T_ERROR_CODES.CONSENT_NOT_FOUND,
							status: 404,
							data: {
								domain: params.domain,
								...(params.identifierType === 'subjectId'
									? { subjectId: params.subjectId }
									: { externalId: params.externalId }),
							},
						}
					);
				}
			}

			// Get device info from request
			const requestHeaders = ctx.request?.headers as
				| Record<string, string>
				| undefined;
			const deviceInfo = requestHeaders?.['user-agent'] || '';
			// @ts-expect-error
			const ipAddress = ctx.request?.ip || '';

			// Process each consent record to withdraw
			const withdrawalResults: Array<{
				id: string;
				consentId: string;
				revokedAt: string;
			}> = [];

			const currentTime = new Date();

			for (const record of recordsToWithdraw) {
				// Use the revokeConsent method from the internal adapter
				const withdrawalResult = await registry.revokeConsent({
					consentId: record.id,
					reason: params.reason || '',
					actor: params.actor || 'system',
					metadata: params.metadata || {},
				});

				// Add consent record for the consentWithdrawal
				await registry.createConsentRecord({
					subjectId: record.subjectId,
					consentId: record.id,
					actionType: 'withdraw_consent',
					details: {
						reason: params.reason,
						method: params.method,
						identifierType: params.identifierType,
						withdrawnAt: currentTime.toISOString(),
					},
					createdAt: currentTime,
					updatedAt: currentTime,
				});

				// Log the action in the audit log
				await registry.createAuditLog({
					subjectId: record.subjectId,
					entityType: 'consent',
					entityId: record.id,
					actionType: 'withdraw_consent',
					changes: {
						policyVersion: record.policyId,
					},
					metadata: {
						source: 'api',
						...params.metadata,
					},
					ipAddress,
					userAgent: deviceInfo,
					createdAt: currentTime,
				});

				withdrawalResults.push({
					id: withdrawalResult?.id || `wdr_${record.id}`,
					consentId: record.id,
					revokedAt: currentTime.toISOString(),
				});
			}

			// Return success response with consentWithdrawal details
			return {
				success: true,
				data: {
					withdrawalIds: withdrawalResults.map((wr) => wr.id),
					consentIds: withdrawalResults.map((wr) => wr.consentId),
					revokedAt:
						withdrawalResults[0]?.revokedAt || currentTime.toISOString(),
				},
			};
		} catch (error) {
			const context = ctx.context as C15TContext;
			context.logger?.error?.('Error withdrawing consent:', error);

			if (error instanceof DoubleTieError) {
				throw error;
			}
			if (error instanceof z.ZodError) {
				throw new DoubleTieError(
					'The request data is invalid. Please ensure all required fields are correctly filled and formatted.',
					{
						code: ERROR_CODES.BAD_REQUEST,
						status: 400,
						data: { details: error.errors },
					}
				);
			}

			throw new DoubleTieError(
				'Failed to withdraw consent. Please try again later or contact support if the issue persists.',
				{
					code: ERROR_CODES.INTERNAL_SERVER_ERROR,
					status: 503,
					data: {
						error: error instanceof Error ? error.message : String(error),
					},
				}
			);
		}
	}
);
