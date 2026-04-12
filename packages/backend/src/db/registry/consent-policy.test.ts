import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConsentPolicy, PolicyType } from '../schema';
import { buildLegalDocumentPolicyId, policyRegistry } from './consent-policy';
import type { Registry } from './types';

vi.mock('./utils/generate-id', () => ({
	generateUniqueId: vi.fn().mockResolvedValue('pol_test'),
}));

describe('policyRegistry', () => {
	const mockLogger = {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	};

	/**
	 * Creates a mock consent policy object with the specified overrides
	 *
	 * @param overrides - Partial consent policy properties to override defaults
	 * @returns A complete ConsentPolicy object for testing
	 */
	const createMockConsentPolicy = (
		overrides: Partial<ConsentPolicy> = {}
	): ConsentPolicy => ({
		id: 'pol_test',
		version: '1.0.0',
		type: 'privacy_policy',
		effectiveDate: new Date('2024-01-01T00:00:00.000Z'),
		isActive: true,
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		...overrides,
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('findConsentPolicyById', () => {
		it('should return policy when found by id', async () => {
			const mockPolicy = createMockConsentPolicy({
				id: 'pol_specific_123',
				type: 'cookie_banner',
			});

			const db = {
				findFirst: vi.fn().mockResolvedValue(mockPolicy),
			};

			const registry = policyRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			const result = await registry.findConsentPolicyById('pol_specific_123');

			expect(db.findFirst).toHaveBeenCalledWith('consentPolicy', {
				where: expect.any(Function),
			});

			expect(result).toEqual(mockPolicy);
		});

		it('should return null when policy not found by id', async () => {
			const db = {
				findFirst: vi.fn().mockResolvedValue(null),
			};

			const registry = policyRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			const result = await registry.findConsentPolicyById('nonexistent_id');

			expect(db.findFirst).toHaveBeenCalledWith('consentPolicy', {
				where: expect.any(Function),
			});

			expect(result).toBeNull();
		});

		it('should handle various policy id formats', async () => {
			const testIds = [
				'pol_123',
				'policy_test_long_id_name',
				'SHORT',
				'ID_WITH_UNDERSCORES',
				'mixed.Case-id_123',
			];

			for (const testId of testIds) {
				const mockPolicy = createMockConsentPolicy({ id: testId });

				const db = {
					findFirst: vi.fn().mockResolvedValue(mockPolicy),
				};

				const registry = policyRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.findConsentPolicyById(testId);

				expect(result?.id).toBe(testId);
				expect(db.findFirst).toHaveBeenCalledWith('consentPolicy', {
					where: expect.any(Function),
				});

				vi.clearAllMocks();
			}
		});

		it('should propagate database errors', async () => {
			const dbError = new Error('Database connection failed');
			const db = {
				findFirst: vi.fn().mockRejectedValue(dbError),
			};

			const registry = policyRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			const promise = registry.findConsentPolicyById('error_id');

			await expect(promise).rejects.toThrow('Database connection failed');
		});
	});

	describe('findOrCreatePolicy', () => {
		describe('when policy exists', () => {
			it('should return existing active policy for given type', async () => {
				const mockPolicy = createMockConsentPolicy({
					type: 'terms_and_conditions',
					version: '2.1.0',
					isActive: true,
				});

				const db = {
					findFirst: vi.fn().mockResolvedValue(mockPolicy),
					create: vi.fn(),
				};

				const registry = policyRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.findOrCreatePolicy(
					'terms_and_conditions'
				);

				expect(db.findFirst).toHaveBeenCalledWith('consentPolicy', {
					where: expect.any(Function),
					orderBy: ['effectiveDate', 'desc'],
				});

				expect(db.create).not.toHaveBeenCalled();
				expect(result).toEqual(mockPolicy);
				expect(mockLogger.debug).toHaveBeenCalledWith('Found existing policy', {
					type: 'terms_and_conditions',
					policyId: mockPolicy.id,
				});
			});

			it('should handle all valid policy types', async () => {
				const validPolicyTypes: PolicyType[] = [
					'cookie_banner',
					'privacy_policy',
					'dpa',
					'terms_and_conditions',
					'marketing_communications',
					'age_verification',
					'other',
				];

				for (const policyType of validPolicyTypes) {
					const mockPolicy = createMockConsentPolicy({
						type: policyType,
					});

					const db = {
						findFirst: vi.fn().mockResolvedValue(mockPolicy),
						create: vi.fn(),
					};

					const registry = policyRegistry({
						db,
						ctx: { logger: mockLogger },
					} as unknown as Registry);

					const result = await registry.findOrCreatePolicy(policyType);

					expect(result.type).toBe(policyType);
					expect(db.create).not.toHaveBeenCalled();

					vi.clearAllMocks();
				}
			});

			it('should return most recent active policy when multiple exist', async () => {
				const mostRecentPolicy = createMockConsentPolicy({
					id: 'pol_most_recent',
					effectiveDate: new Date('2024-03-01T00:00:00.000Z'),
					version: '3.0.0',
				});

				const db = {
					findFirst: vi.fn().mockResolvedValue(mostRecentPolicy),
					create: vi.fn(),
				};

				const registry = policyRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.findOrCreatePolicy('privacy_policy');

				expect(db.findFirst).toHaveBeenCalledWith('consentPolicy', {
					where: expect.any(Function),
					orderBy: ['effectiveDate', 'desc'],
				});

				expect(result).toEqual(mostRecentPolicy);
				expect(result.id).toBe('pol_most_recent');
			});
		});

		describe('when policy does not exist', () => {
			it('should create new policy with minimal fields', async () => {
				const fakeDate = new Date('2024-01-15T10:30:00.000Z');
				vi.useFakeTimers();
				vi.setSystemTime(fakeDate);

				const newMockPolicy = createMockConsentPolicy({
					id: 'pol_test',
					type: 'dpa',
					effectiveDate: fakeDate,
				});

				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockResolvedValue(newMockPolicy),
				};

				const registry = policyRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.findOrCreatePolicy('dpa');

				expect(db.findFirst).toHaveBeenCalledWith('consentPolicy', {
					where: expect.any(Function),
					orderBy: ['effectiveDate', 'desc'],
				});

				expect(db.create).toHaveBeenCalledWith('consentPolicy', {
					id: 'pol_test',
					version: '1.0.0',
					type: 'dpa',
					effectiveDate: fakeDate,
					isActive: true,
				});

				expect(result).toEqual(newMockPolicy);

				vi.useRealTimers();
			});

			it('should create policies for all valid types with correct defaults', async () => {
				const validPolicyTypes: PolicyType[] = [
					'cookie_banner',
					'privacy_policy',
					'dpa',
					'terms_and_conditions',
					'marketing_communications',
					'age_verification',
					'other',
				];

				const fakeDate = new Date('2024-02-01T00:00:00.000Z');
				vi.useFakeTimers();
				vi.setSystemTime(fakeDate);

				for (const policyType of validPolicyTypes) {
					const mockPolicy = createMockConsentPolicy({
						type: policyType,
						effectiveDate: fakeDate,
					});

					const db = {
						findFirst: vi.fn().mockResolvedValue(null),
						create: vi.fn().mockResolvedValue(mockPolicy),
					};

					const registry = policyRegistry({
						db,
						ctx: { logger: mockLogger },
					} as unknown as Registry);

					const result = await registry.findOrCreatePolicy(policyType);

					expect(db.create).toHaveBeenCalledWith('consentPolicy', {
						id: 'pol_test',
						version: '1.0.0',
						type: policyType,
						effectiveDate: fakeDate,
						isActive: true,
					});

					expect(result.type).toBe(policyType);
					expect(result.version).toBe('1.0.0');
					expect(result.isActive).toBe(true);

					vi.clearAllMocks();
				}

				vi.useRealTimers();
			});
		});

		describe('error handling', () => {
			it('should propagate database findFirst errors', async () => {
				const dbError = new Error('Database query failed');
				const db = {
					findFirst: vi.fn().mockRejectedValue(dbError),
				};

				const registry = policyRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const promise = registry.findOrCreatePolicy('privacy_policy');

				await expect(promise).rejects.toThrow('Database query failed');
			});

			it('should propagate database create errors', async () => {
				const dbError = new Error('Create operation failed');
				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockRejectedValue(dbError),
				};

				const registry = policyRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const promise = registry.findOrCreatePolicy('privacy_policy');

				await expect(promise).rejects.toThrow('Create operation failed');
			});
		});
	});

	describe('database query construction', () => {
		it('should construct correct query for policy lookup by id', async () => {
			const db = {
				findFirst: vi.fn().mockResolvedValue(null),
			};

			const registry = policyRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			await registry.findConsentPolicyById('test_id');

			expect(db.findFirst).toHaveBeenCalledWith('consentPolicy', {
				where: expect.any(Function),
			});

			const whereCall = db.findFirst.mock.calls[0]?.[1];
			expect(whereCall).toHaveProperty('where');
			expect(typeof whereCall?.where).toBe('function');
		});

		it('should construct correct query for active policy lookup by type', async () => {
			const db = {
				findFirst: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockResolvedValue(createMockConsentPolicy()),
			};

			const registry = policyRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			await registry.findOrCreatePolicy('privacy_policy');

			expect(db.findFirst).toHaveBeenCalledWith('consentPolicy', {
				where: expect.any(Function),
				orderBy: ['effectiveDate', 'desc'],
			});

			const findCall = db.findFirst.mock.calls[0]?.[1];
			expect(findCall).toHaveProperty('where');
			expect(findCall).toHaveProperty('orderBy');
			expect(findCall?.orderBy).toEqual(['effectiveDate', 'desc']);
		});
	});

	describe('edge cases', () => {
		it('should handle concurrent policy creation requests', async () => {
			const fakeDate = new Date('2024-01-01T00:00:00.000Z');
			vi.useFakeTimers();
			vi.setSystemTime(fakeDate);

			const mockPolicy = createMockConsentPolicy({
				type: 'privacy_policy',
				effectiveDate: fakeDate,
			});

			const db = {
				findFirst: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockResolvedValue(mockPolicy),
			};

			const registry = policyRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			// Simulate concurrent requests
			const promises = [
				registry.findOrCreatePolicy('privacy_policy'),
				registry.findOrCreatePolicy('privacy_policy'),
				registry.findOrCreatePolicy('privacy_policy'),
			];

			const results = await Promise.all(promises);

			// All should succeed (actual uniqueness would be handled by database constraints)
			expect(results).toHaveLength(3);
			for (const result of results) {
				expect(result.type).toBe('privacy_policy');
			}

			expect(db.create).toHaveBeenCalledTimes(3);

			vi.useRealTimers();
		});
	});

	describe('legal document policy helpers', () => {
		it('findLatestPolicyByType performs a non-mutating lookup', async () => {
			const mockPolicy = createMockConsentPolicy({
				id: 'pol_latest',
				type: 'privacy_policy',
			});
			const db = {
				findFirst: vi.fn().mockResolvedValue(mockPolicy),
			};

			const registry = policyRegistry({
				db,
				ctx: { logger: mockLogger, tenantId: 'ins_123' },
			} as unknown as Registry);

			const result = await registry.findLatestPolicyByType('privacy_policy');

			expect(result).toEqual(mockPolicy);
			expect(db.findFirst).toHaveBeenCalledWith('consentPolicy', {
				where: expect.any(Function),
				orderBy: ['effectiveDate', 'desc'],
			});
		});

		it('syncCurrentLegalDocumentPolicy creates a new active release and deactivates the previous one', async () => {
			const policyId = await buildLegalDocumentPolicyId({
				tenantId: 'ins_123',
				type: 'privacy_policy',
				hash: 'hash_123',
			});
			const createdPolicy = createMockConsentPolicy({
				id: policyId,
				type: 'privacy_policy',
				version: '2026-04-07',
				hash: 'hash_123',
				effectiveDate: new Date('2026-04-07T00:00:00.000Z'),
				isActive: true,
			});
			const tx = {
				findFirst: vi.fn().mockResolvedValue(null),
				updateMany: vi.fn().mockResolvedValue(undefined),
				create: vi.fn().mockResolvedValue(createdPolicy),
			};
			const db = {
				transaction: vi.fn(async (fn: (tx: typeof tx) => unknown) => fn(tx)),
			};

			const registry = policyRegistry({
				db,
				ctx: { logger: mockLogger, tenantId: 'ins_123' },
			} as unknown as Registry);

			const result = await registry.syncCurrentLegalDocumentPolicy({
				type: 'privacy_policy',
				version: '2026-04-07',
				hash: 'hash_123',
				effectiveDate: new Date('2026-04-07T00:00:00.000Z'),
			});

			expect(result).toEqual(createdPolicy);
			expect(tx.updateMany).toHaveBeenCalledWith('consentPolicy', {
				where: expect.any(Function),
				set: { isActive: false },
			});
			expect(tx.create).toHaveBeenCalledWith(
				'consentPolicy',
				expect.objectContaining({
					id: policyId,
					type: 'privacy_policy',
					hash: 'hash_123',
					isActive: true,
				})
			);
		});

		it('syncCurrentLegalDocumentPolicy is idempotent for the same release metadata', async () => {
			const policyId = await buildLegalDocumentPolicyId({
				tenantId: 'ins_123',
				type: 'privacy_policy',
				hash: 'hash_123',
			});
			const existingPolicy = createMockConsentPolicy({
				id: policyId,
				type: 'privacy_policy',
				version: '2026-04-07',
				hash: 'hash_123',
				effectiveDate: new Date('2026-04-07T00:00:00.000Z'),
				isActive: true,
			});
			const tx = {
				findFirst: vi.fn().mockResolvedValue(existingPolicy),
				updateMany: vi.fn().mockResolvedValue(undefined),
				create: vi.fn(),
			};
			const db = {
				transaction: vi.fn(async (fn: (tx: typeof tx) => unknown) => fn(tx)),
			};

			const registry = policyRegistry({
				db,
				ctx: { logger: mockLogger, tenantId: 'ins_123' },
			} as unknown as Registry);

			const result = await registry.syncCurrentLegalDocumentPolicy({
				type: 'privacy_policy',
				version: '2026-04-07',
				hash: 'hash_123',
				effectiveDate: new Date('2026-04-07T00:00:00.000Z'),
			});

			expect(result).toEqual(existingPolicy);
			expect(tx.create).not.toHaveBeenCalled();
		});

		it('syncCurrentLegalDocumentPolicy rejects conflicting metadata for the same release', async () => {
			const policyId = await buildLegalDocumentPolicyId({
				tenantId: 'ins_123',
				type: 'privacy_policy',
				hash: 'hash_123',
			});
			const existingPolicy = createMockConsentPolicy({
				id: policyId,
				type: 'privacy_policy',
				version: '2026-04-06',
				hash: 'hash_123',
				effectiveDate: new Date('2026-04-06T00:00:00.000Z'),
				isActive: true,
			});
			const tx = {
				findFirst: vi.fn().mockResolvedValue(existingPolicy),
				updateMany: vi.fn().mockResolvedValue(undefined),
				create: vi.fn(),
			};
			const db = {
				transaction: vi.fn(async (fn: (tx: typeof tx) => unknown) => fn(tx)),
			};

			const registry = policyRegistry({
				db,
				ctx: { logger: mockLogger, tenantId: 'ins_123' },
			} as unknown as Registry);

			await expect(
				registry.syncCurrentLegalDocumentPolicy({
					type: 'privacy_policy',
					version: '2026-04-07',
					hash: 'hash_123',
					effectiveDate: new Date('2026-04-07T00:00:00.000Z'),
				})
			).rejects.toMatchObject({
				name: 'LegalDocumentPolicyConflictError',
			});
		});

		it('findOrCreateLegalDocumentPolicy creates historical releases as inactive when a latest release already exists', async () => {
			const historicalPolicyId = await buildLegalDocumentPolicyId({
				tenantId: 'ins_123',
				type: 'privacy_policy',
				hash: 'hash_123',
			});
			const historicalPolicy = createMockConsentPolicy({
				id: historicalPolicyId,
				type: 'privacy_policy',
				version: '2026-04-07',
				hash: 'hash_123',
				effectiveDate: new Date('2026-04-07T00:00:00.000Z'),
				isActive: false,
			});
			const db = {
				findFirst: vi.fn().mockResolvedValueOnce(null),
				create: vi.fn().mockResolvedValue(historicalPolicy),
			};

			const registry = policyRegistry({
				db,
				ctx: { logger: mockLogger, tenantId: 'ins_123' },
			} as unknown as Registry);

			const result = await registry.findOrCreateLegalDocumentPolicy({
				type: 'privacy_policy',
				version: '2026-04-07',
				hash: 'hash_123',
				effectiveDate: new Date('2026-04-07T00:00:00.000Z'),
			});

			expect(result).toEqual(historicalPolicy);
			expect(db.create).toHaveBeenCalledWith(
				'consentPolicy',
				expect.objectContaining({
					id: historicalPolicyId,
					isActive: false,
				})
			);
		});

		it('findOrCreateLegalDocumentPolicy does not promote the first seen receipt to active', async () => {
			const policyId = await buildLegalDocumentPolicyId({
				tenantId: 'ins_123',
				type: 'privacy_policy',
				hash: 'hash_123',
			});
			const historicalPolicy = createMockConsentPolicy({
				id: policyId,
				type: 'privacy_policy',
				version: '2026-04-07',
				hash: 'hash_123',
				effectiveDate: new Date('2026-04-07T00:00:00.000Z'),
				isActive: false,
			});
			const db = {
				findFirst: vi.fn().mockResolvedValueOnce(null),
				create: vi.fn().mockResolvedValue(historicalPolicy),
			};

			const registry = policyRegistry({
				db,
				ctx: { logger: mockLogger, tenantId: 'ins_123' },
			} as unknown as Registry);

			const result = await registry.findOrCreateLegalDocumentPolicy({
				type: 'privacy_policy',
				version: '2026-04-07',
				hash: 'hash_123',
				effectiveDate: new Date('2026-04-07T00:00:00.000Z'),
			});

			expect(result).toEqual(historicalPolicy);
			expect(db.create).toHaveBeenCalledWith(
				'consentPolicy',
				expect.objectContaining({
					id: policyId,
					isActive: false,
				})
			);
		});
	});
});
