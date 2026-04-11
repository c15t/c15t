import { hashSha256Hex } from '@c15t/schema/types';
import { withDatabaseSpan } from '~/utils/instrumentation';
import { getMetrics } from '~/utils/metrics';
import type { LegalDocumentPolicyType, PolicyType } from '../schema';
import type { Registry } from './types';
import { generateUniqueId } from './utils/generate-id';

export interface LegalDocumentPolicyInput {
	type: LegalDocumentPolicyType;
	version: string;
	hash: string;
	effectiveDate: Date;
}

export class LegalDocumentPolicyConflictError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'LegalDocumentPolicyConflictError';
	}
}

export async function buildLegalDocumentPolicyId(input: {
	tenantId?: string;
	type: LegalDocumentPolicyType;
	hash: string;
}) {
	const digest = await hashSha256Hex(
		[input.tenantId ?? 'default', input.type, input.hash].join('|')
	);
	return `pol_${digest}`;
}

function hasLegalDocumentPolicyConflict(
	policy: {
		version: string;
		hash: string | null | undefined;
		effectiveDate: Date;
	},
	input: LegalDocumentPolicyInput
) {
	return (
		policy.version !== input.version ||
		policy.hash !== input.hash ||
		policy.effectiveDate.getTime() !== input.effectiveDate.getTime()
	);
}

export function policyRegistry({ db, ctx }: Registry) {
	const { logger } = ctx;

	return {
		findConsentPolicyById: async (policyId: string) => {
			const start = Date.now();
			try {
				const result = await withDatabaseSpan(
					{ operation: 'find', entity: 'consentPolicy' },
					async () => {
						const policy = await db.findFirst('consentPolicy', {
							where: (b) => b('id', '=', policyId),
						});
						return policy;
					}
				);
				getMetrics()?.recordDbQuery(
					{ operation: 'find', entity: 'consentPolicy' },
					Date.now() - start
				);
				return result;
			} catch (error) {
				getMetrics()?.recordDbError({
					operation: 'find',
					entity: 'consentPolicy',
				});
				throw error;
			}
		},
		findLatestPolicyByType: async (type: PolicyType) => {
			const start = Date.now();
			try {
				const result = await withDatabaseSpan(
					{ operation: 'findLatest', entity: 'consentPolicy' },
					async () =>
						db.findFirst('consentPolicy', {
							where: (b) =>
								b.and(b('isActive', '=', true), b('type', '=', type)),
							orderBy: ['effectiveDate', 'desc'],
						})
				);
				getMetrics()?.recordDbQuery(
					{ operation: 'findLatest', entity: 'consentPolicy' },
					Date.now() - start
				);
				return result;
			} catch (error) {
				getMetrics()?.recordDbError({
					operation: 'findLatest',
					entity: 'consentPolicy',
				});
				throw error;
			}
		},
		findLegalDocumentPolicyByHash: async (
			type: LegalDocumentPolicyType,
			hash: string
		) => {
			const start = Date.now();
			try {
				const policyId = await buildLegalDocumentPolicyId({
					tenantId: ctx.tenantId,
					type,
					hash,
				});
				const result = await withDatabaseSpan(
					{ operation: 'findByHash', entity: 'consentPolicy' },
					async () =>
						db.findFirst('consentPolicy', {
							where: (b) => b('id', '=', policyId),
						})
				);
				getMetrics()?.recordDbQuery(
					{ operation: 'findByHash', entity: 'consentPolicy' },
					Date.now() - start
				);
				return result;
			} catch (error) {
				getMetrics()?.recordDbError({
					operation: 'findByHash',
					entity: 'consentPolicy',
				});
				throw error;
			}
		},
		syncCurrentLegalDocumentPolicy: async (input: LegalDocumentPolicyInput) => {
			const start = Date.now();
			try {
				const result = await withDatabaseSpan(
					{ operation: 'syncCurrent', entity: 'consentPolicy' },
					async () => {
						const policyId = await buildLegalDocumentPolicyId({
							tenantId: ctx.tenantId,
							type: input.type,
							hash: input.hash,
						});

						return db.transaction(async (tx) => {
							const existing = await tx.findFirst('consentPolicy', {
								where: (b) => b('id', '=', policyId),
							});

							if (existing) {
								if (hasLegalDocumentPolicyConflict(existing, input)) {
									throw new LegalDocumentPolicyConflictError(
										'Release metadata conflicts with existing consent policy'
									);
								}

								await tx.updateMany('consentPolicy', {
									where: (b) =>
										b.and(
											b('type', '=', input.type),
											b('isActive', '=', true),
											b('id', '!=', existing.id)
										),
									set: { isActive: false },
								});

								if (!existing.isActive) {
									await tx.updateMany('consentPolicy', {
										where: (b) => b('id', '=', existing.id),
										set: { isActive: true },
									});
									return {
										...existing,
										isActive: true,
									};
								}

								return existing;
							}

							await tx.updateMany('consentPolicy', {
								where: (b) =>
									b.and(b('type', '=', input.type), b('isActive', '=', true)),
								set: { isActive: false },
							});

							const policy = await tx.create('consentPolicy', {
								id: policyId,
								version: input.version,
								type: input.type,
								hash: input.hash,
								effectiveDate: input.effectiveDate,
								isActive: true,
							});

							return policy;
						});
					}
				);
				getMetrics()?.recordDbQuery(
					{ operation: 'syncCurrent', entity: 'consentPolicy' },
					Date.now() - start
				);
				return result;
			} catch (error) {
				getMetrics()?.recordDbError({
					operation: 'syncCurrent',
					entity: 'consentPolicy',
				});
				throw error;
			}
		},
		findOrCreateLegalDocumentPolicy: async (
			input: LegalDocumentPolicyInput
		) => {
			const start = Date.now();
			try {
				const result = await withDatabaseSpan(
					{ operation: 'findOrCreateLegalDocument', entity: 'consentPolicy' },
					async () => {
						const policyId = await buildLegalDocumentPolicyId({
							tenantId: ctx.tenantId,
							type: input.type,
							hash: input.hash,
						});

						const existing = await db.findFirst('consentPolicy', {
							where: (b) => b('id', '=', policyId),
						});

						if (existing) {
							if (hasLegalDocumentPolicyConflict(existing, input)) {
								throw new LegalDocumentPolicyConflictError(
									'Release metadata conflicts with existing consent policy'
								);
							}

							return existing;
						}

						const policy = await db
							.create('consentPolicy', {
								id: policyId,
								version: input.version,
								type: input.type,
								hash: input.hash,
								effectiveDate: input.effectiveDate,
								isActive: false,
							})
							.catch(async () => {
								const concurrent = await db.findFirst('consentPolicy', {
									where: (b) => b('id', '=', policyId),
								});

								if (!concurrent) {
									throw new LegalDocumentPolicyConflictError(
										'Failed to create legal document consent policy'
									);
								}

								if (hasLegalDocumentPolicyConflict(concurrent, input)) {
									throw new LegalDocumentPolicyConflictError(
										'Release metadata conflicts with existing consent policy'
									);
								}

								return concurrent;
							});

						return policy;
					}
				);
				getMetrics()?.recordDbQuery(
					{ operation: 'findOrCreateLegalDocument', entity: 'consentPolicy' },
					Date.now() - start
				);
				return result;
			} catch (error) {
				getMetrics()?.recordDbError({
					operation: 'findOrCreateLegalDocument',
					entity: 'consentPolicy',
				});
				throw error;
			}
		},
		findOrCreatePolicy: async (type: PolicyType) => {
			const start = Date.now();
			try {
				const result = await withDatabaseSpan(
					{ operation: 'findOrCreate', entity: 'consentPolicy' },
					async () => {
						// Gets most recent active policy for a given type
						const existingPolicy = await db.findFirst('consentPolicy', {
							where: (b) =>
								b.and(b('isActive', '=', true), b('type', '=', type)),
							orderBy: ['effectiveDate', 'desc'],
						});

						if (existingPolicy) {
							logger.debug('Found existing policy', {
								type,
								policyId: existingPolicy.id,
							});
							return existingPolicy;
						}

						const policy = await db.create('consentPolicy', {
							id: await generateUniqueId(db, 'consentPolicy', ctx),
							version: '1.0.0',
							type,
							effectiveDate: new Date(),
							isActive: true,
						});

						return policy;
					}
				);
				getMetrics()?.recordDbQuery(
					{ operation: 'findOrCreate', entity: 'consentPolicy' },
					Date.now() - start
				);
				return result;
			} catch (error) {
				getMetrics()?.recordDbError({
					operation: 'findOrCreate',
					entity: 'consentPolicy',
				});
				throw error;
			}
		},
	};
}
