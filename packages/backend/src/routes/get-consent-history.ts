import { z } from 'zod';
import { createAuthEndpoint } from '~/pkgs/api-router';
import { logger } from '~/pkgs/logger';
import { DoubleTieError, ERROR_CODES } from '~/pkgs/results';
import type { EntityOutputFields } from '~/schema/definition';

// Define the schema for validating request parameters
const getConsentHistorySchema = z.object({
	subjectId: z.string(),
	domain: z.string().optional(),
	limit: z.coerce.number().int().positive().max(1000).default(100),
	offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Endpoint for retrieving a subject's complete consent history.
 *
 * This endpoint returns comprehensive information about a subject's consent records,
 * including all consent entries, withdrawals, related evidence records, and audit logs.
 * It supports optional domain filtering and pagination to manage large result sets.
 *
 * @endpoint GET /consent/history
 */
export const getConsentHistory = createAuthEndpoint(
	'/consent/history',
	{
		method: 'GET',
		query: getConsentHistorySchema,
	},
	async (ctx) => {
		try {
			const params = getConsentHistorySchema.parse(ctx.query);
			const { registry } = ctx.context;

			if (!registry) {
				throw new DoubleTieError(
					'The registry service is currently unavailable. Please check the service status and try again later.',
					{
						code: ERROR_CODES.INITIALIZATION_FAILED,
						status: 503,
					}
				);
			}

			let subjectConsents = await registry.findConsents({
				subjectId: params.subjectId,
			});
			if (params.domain) {
				subjectConsents = subjectConsents.filter(
					(consent) => consent.domainId === params.domain
				);
			}

			// Sort consents by givenAt date
			subjectConsents.sort((a, b) => b.givenAt.getTime() - a.givenAt.getTime());

			// Apply pagination
			const start = params.offset;
			const end = start + params.limit;
			const paginatedConsents = subjectConsents.slice(start, end);

			// Process each consent to include withdrawals and records
			const processedConsents = await Promise.all(
				paginatedConsents.map(async (consent) => {
					const consentWithdrawals = await registry.getWithdrawals(consent.id);
					const records = await registry.getRecords(consent.id);

					return {
						id: consent.id,
						domainId: consent.domainId,
						status: consent.status as string,
						givenAt: consent.givenAt.toISOString(),
						consentWithdrawals: consentWithdrawals.map((consentWithdrawal) => ({
							id: consentWithdrawal.id,
							createdAt: consentWithdrawal.createdAt.toISOString(),
							reason: consentWithdrawal.withdrawalReason,
							method: consentWithdrawal.withdrawalMethod,
							actor:
								(consentWithdrawal.metadata as Record<string, unknown>)
									?.actor || 'system',
							metadata: consentWithdrawal.metadata,
						})),
						consentRecords: records.map(
							(record: EntityOutputFields<'consentRecord'>) => ({
								id: record.id,
								createdAt: record.createdAt.toISOString(),
								type: record.actionType,
								details: record.id,
							})
						),
					};
				})
			);

			// Get audit logs if available
			let auditLogs: Array<{
				id: string;
				createdAt: string;
				actionType: string;
				details: Record<string, unknown>;
			}> = [];
			if ('findAuditLogs' in registry) {
				const logs = await registry.findAuditLogs(params.subjectId);
				auditLogs = logs.map((log: EntityOutputFields<'auditLog'>) => ({
					id: log.id,
					createdAt: log.createdAt.toISOString(),
					actionType: log.actionType as string,
					details: log.changes as Record<string, unknown>,
				}));
			}

			const response = {
				success: true,
				data: {
					consents: processedConsents,
					auditLogs,
					pagination: {
						total: subjectConsents.length,
						offset: params.offset,
						limit: params.limit,
					},
				},
			};

			return response;
		} catch (error) {
			logger.error('Error getting consent history:', error);
			throw error;
		}
	}
);
