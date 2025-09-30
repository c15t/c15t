import { ORPCError } from '@orpc/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConsentPolicy, PolicyType } from '../schema';
import { policyRegistry } from './consent-policy';
import type { Registry } from './types';

describe('policyRegistry', () => {
	const mockLogger = {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	};

	vi.mock('./utils/generate-id', () => ({
		generateUniqueId: vi.fn().mockResolvedValue('pol_test'),
	}));

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
		name: 'privacy_policy',
		effectiveDate: new Date('2024-01-01T00:00:00.000Z'),
		expirationDate: null,
		content:
			'[PLACEHOLDER] This is an automatically generated version of the privacy_policy policy.\n\nThis placeholder content should be replaced with actual policy terms before being presented to users.\n\nGenerated on: 2024-01-01T00:00:00.000Z',
		contentHash: 'test_hash_123',
		isActive: true,
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		...overrides,
	});

	/**
	 * Mock implementation of crypto.subtle.digest for testing
	 * Returns a predictable hash for consistent testing
	 */
	const mockCryptoSubtle = {
		digest: vi.fn().mockResolvedValue(
			new ArrayBuffer(32) // SHA-256 produces 32 bytes
		),
	};

	// Mock the global crypto object
	beforeEach(() => {
		// Reset the mock to return zeros for predictable hash
		const mockArrayBuffer = new ArrayBuffer(32);
		const view = new Uint8Array(mockArrayBuffer);
		view.fill(0); // Fill with zeros for predictable hash "0000..."
		mockCryptoSubtle.digest.mockResolvedValue(mockArrayBuffer);

		// Mock the crypto.subtle.digest method using vitest spy
		vi.stubGlobal('crypto', {
			subtle: mockCryptoSubtle,
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.unstubAllGlobals();
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
						name: policyType,
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
					expect(result.name).toBe(policyType);
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
			it('should create new policy with placeholder content', async () => {
				const fakeDate = new Date('2024-01-15T10:30:00.000Z');
				vi.useFakeTimers();
				vi.setSystemTime(fakeDate);

				const newMockPolicy = createMockConsentPolicy({
					id: 'pol_test',
					type: 'dpa',
					name: 'dpa',
					effectiveDate: fakeDate,
					content: `[PLACEHOLDER] This is an automatically generated version of the dpa policy.\n\nThis placeholder content should be replaced with actual policy terms before being presented to users.\n\nGenerated on: ${fakeDate.toISOString()}`,
					contentHash:
						'0000000000000000000000000000000000000000000000000000000000000000',
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
					name: 'dpa',
					effectiveDate: fakeDate,
					content: `[PLACEHOLDER] This is an automatically generated version of the dpa policy.\n\nThis placeholder content should be replaced with actual policy terms before being presented to users.\n\nGenerated on: ${fakeDate.toISOString()}`,
					contentHash:
						'0000000000000000000000000000000000000000000000000000000000000000',
					isActive: true,
					expirationDate: null,
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
						name: policyType,
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
						name: policyType,
						effectiveDate: fakeDate,
						content: expect.stringContaining(
							`[PLACEHOLDER] This is an automatically generated version of the ${policyType} policy.`
						),
						contentHash: expect.any(String),
						isActive: true,
						expirationDate: null,
					});

					expect(result.type).toBe(policyType);
					expect(result.name).toBe(policyType);
					expect(result.version).toBe('1.0.0');
					expect(result.isActive).toBe(true);
					expect(result.expirationDate).toBeNull();

					vi.clearAllMocks();
				}

				vi.useRealTimers();
			});

			it('should generate correct placeholder content structure', async () => {
				const fakeDate = new Date('2024-06-15T14:30:45.123Z');
				vi.useFakeTimers();
				vi.setSystemTime(fakeDate);

				const mockPolicy = createMockConsentPolicy({
					type: 'marketing_communications',
					content: `[PLACEHOLDER] This is an automatically generated version of the marketing_communications policy.\n\nThis placeholder content should be replaced with actual policy terms before being presented to users.\n\nGenerated on: ${fakeDate.toISOString()}`,
				});

				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockResolvedValue(mockPolicy),
				};

				const registry = policyRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				await registry.findOrCreatePolicy('marketing_communications');

				const createCall = db.create.mock.calls[0]?.[1];
				expect(createCall?.content).toBe(
					`[PLACEHOLDER] This is an automatically generated version of the marketing_communications policy.\n\nThis placeholder content should be replaced with actual policy terms before being presented to users.\n\nGenerated on: ${fakeDate.toISOString()}`
				);

				expect(createCall?.content).toContain('[PLACEHOLDER]');
				expect(createCall?.content).toContain(
					'marketing_communications policy'
				);
				expect(createCall?.content).toContain(fakeDate.toISOString());

				vi.useRealTimers();
			});
		});

		describe('content hash generation', () => {
			it('should generate SHA-256 hash of policy content', async () => {
				const testContent = 'Test policy content for hashing';
				const expectedHash =
					'0000000000000000000000000000000000000000000000000000000000000000';

				const mockPolicy = createMockConsentPolicy({
					content: testContent,
					contentHash: expectedHash,
				});

				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockResolvedValue(mockPolicy),
				};

				const registry = policyRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				await registry.findOrCreatePolicy('privacy_policy');

				expect(mockCryptoSubtle.digest).toHaveBeenCalledWith(
					'SHA-256',
					expect.any(Uint8Array)
				);

				const createCall = db.create.mock.calls[0]?.[1];
				expect(createCall?.contentHash).toBe(expectedHash);
			});

			it('should handle different content producing different hashes', async () => {
				// Mock different hash results for different content
				const hash1Buffer = new ArrayBuffer(32);
				const hash1View = new Uint8Array(hash1Buffer);
				hash1View.fill(1);

				const hash2Buffer = new ArrayBuffer(32);
				const hash2View = new Uint8Array(hash2Buffer);
				hash2View.fill(2);

				mockCryptoSubtle.digest
					.mockResolvedValueOnce(hash1Buffer)
					.mockResolvedValueOnce(hash2Buffer);

				const policy1 = createMockConsentPolicy({
					type: 'privacy_policy',
					contentHash:
						'0101010101010101010101010101010101010101010101010101010101010101',
				});

				const policy2 = createMockConsentPolicy({
					type: 'cookie_banner',
					contentHash:
						'0202020202020202020202020202020202020202020202020202020202020202',
				});

				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi
						.fn()
						.mockResolvedValueOnce(policy1)
						.mockResolvedValueOnce(policy2),
				};

				const registry = policyRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				await registry.findOrCreatePolicy('privacy_policy');
				await registry.findOrCreatePolicy('cookie_banner');

				const call1 = db.create.mock.calls[0]?.[1];
				const call2 = db.create.mock.calls[1]?.[1];

				expect(call1?.contentHash).toBe(
					'0101010101010101010101010101010101010101010101010101010101010101'
				);
				expect(call2?.contentHash).toBe(
					'0202020202020202020202020202020202020202020202020202020202020202'
				);
				expect(call1?.contentHash).not.toBe(call2?.contentHash);
			});
		});

		describe('error handling', () => {
			it('should throw ORPCError when crypto.subtle.digest fails', async () => {
				const cryptoError = new Error('Crypto operation failed');
				mockCryptoSubtle.digest.mockRejectedValue(cryptoError);

				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi.fn(),
				};

				const registry = policyRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const promise = registry.findOrCreatePolicy('privacy_policy');

				await expect(promise).rejects.toBeInstanceOf(ORPCError);
				await expect(promise).rejects.toEqual(
					expect.objectContaining({
						message: 'Failed to generate policy content hash',
						code: 'POLICY_CREATION_FAILED',
						status: 500,
						data: { name: 'privacy_policy' },
					})
				);

				expect(db.create).not.toHaveBeenCalled();
			});

			it('should handle crypto errors with non-Error objects', async () => {
				const cryptoError = 'String error message';
				mockCryptoSubtle.digest.mockRejectedValue(cryptoError);

				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi.fn(),
				};

				const registry = policyRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const promise = registry.findOrCreatePolicy('privacy_policy');

				await expect(promise).rejects.toBeInstanceOf(ORPCError);
				await expect(promise).rejects.toEqual(
					expect.objectContaining({
						message: 'Failed to generate policy content hash',
						code: 'POLICY_CREATION_FAILED',
						status: 500,
						data: { name: 'privacy_policy' },
					})
				);

				const error = await promise.catch((e) => e);
				expect(error).toEqual(
					expect.objectContaining({
						code: 'POLICY_CREATION_FAILED',
						status: 500,
						data: { name: 'privacy_policy' },
					})
				);
			});

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

		it('should handle very long policy type names in content generation', async () => {
			const longPolicyType =
				'very_long_policy_type_name_that_might_cause_issues' as PolicyType;

			const mockPolicy = createMockConsentPolicy({
				type: longPolicyType,
				name: longPolicyType,
			});

			const db = {
				findFirst: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockResolvedValue(mockPolicy),
			};

			const registry = policyRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			const result = await registry.findOrCreatePolicy(longPolicyType);

			expect(result.type).toBe(longPolicyType);
			expect(result.name).toBe(longPolicyType);

			const createCall = db.create.mock.calls[0]?.[1];
			expect(createCall?.content).toContain(longPolicyType);
		});

		it('should handle Unix epoch date in content generation', async () => {
			const edgeDate = new Date('1970-01-01T00:00:00.000Z');
			vi.useFakeTimers();
			vi.setSystemTime(edgeDate);

			const mockPolicy = createMockConsentPolicy({
				effectiveDate: edgeDate,
			});

			const db = {
				findFirst: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockResolvedValue(mockPolicy),
			};

			const registry = policyRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			const result = await registry.findOrCreatePolicy('privacy_policy');

			expect(result.effectiveDate).toEqual(edgeDate);

			const createCall = db.create.mock.calls[0]?.[1];
			expect(createCall?.content).toContain(edgeDate.toISOString());
			expect(createCall?.effectiveDate).toEqual(edgeDate);

			vi.useRealTimers();
		});

		it('should handle leap year date in content generation', async () => {
			const edgeDate = new Date('2024-02-29T23:59:59.999Z');
			vi.useFakeTimers();
			vi.setSystemTime(edgeDate);

			const mockPolicy = createMockConsentPolicy({
				effectiveDate: edgeDate,
			});

			const db = {
				findFirst: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockResolvedValue(mockPolicy),
			};

			const registry = policyRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			const result = await registry.findOrCreatePolicy('privacy_policy');

			expect(result.effectiveDate).toEqual(edgeDate);

			const createCall = db.create.mock.calls[0]?.[1];
			expect(createCall?.content).toContain(edgeDate.toISOString());
			expect(createCall?.effectiveDate).toEqual(edgeDate);

			vi.useRealTimers();
		});
	});
});
