import { HTTPException } from 'hono/http-exception';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConsentPurpose } from '../schema';
import { consentPurposeRegistry } from './consent-purpose';
import type { Registry } from './types';

// Mock generateUniqueId to return a predictable value for assertions
vi.mock('./utils/generate-id', () => ({
	generateUniqueId: vi.fn().mockResolvedValue('cp_test_123'),
}));

describe('consentPurposeRegistry', () => {
	const mockLogger = {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	};

	/**
	 * Creates a mock consent purpose object with the specified overrides
	 *
	 * @param overrides - Partial consent purpose properties to override defaults
	 * @returns A complete ConsentPurpose object for testing
	 */
	const createMockConsentPurpose = (
		overrides: Partial<ConsentPurpose> = {}
	): ConsentPurpose => ({
		id: 'cp_test_123',
		code: 'marketing',
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		updatedAt: new Date('2024-01-01T00:00:00.000Z'),
		...overrides,
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('findOrCreateConsentPurposeByCode', () => {
		describe('when consent purpose exists', () => {
			it('should return existing consent purpose when found by code', async () => {
				const mockPurpose = createMockConsentPurpose({
					code: 'analytics',
				});

				const db = {
					findFirst: vi.fn().mockResolvedValue(mockPurpose),
					create: vi.fn(),
				};

				const registry = consentPurposeRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result =
					await registry.findOrCreateConsentPurposeByCode('analytics');

				expect(db.findFirst).toHaveBeenCalledWith('consentPurpose', {
					where: expect.any(Function),
				});

				expect(db.create).not.toHaveBeenCalled();
				expect(result).toEqual(mockPurpose);
				expect(mockLogger.debug).toHaveBeenCalledWith(
					'Found existing consent purpose',
					{ code: 'analytics' }
				);
			});

			it('should handle different existing consent purpose types', async () => {
				const testCases = [
					{ code: 'essential' },
					{ code: 'preferences' },
					{ code: 'functional' },
				];

				for (const testCase of testCases) {
					const mockPurpose = createMockConsentPurpose(testCase);

					const db = {
						findFirst: vi.fn().mockResolvedValue(mockPurpose),
						create: vi.fn(),
					};

					const registry = consentPurposeRegistry({
						db,
						ctx: { logger: mockLogger },
					} as unknown as Registry);

					const result = await registry.findOrCreateConsentPurposeByCode(
						testCase.code
					);

					expect(result).toEqual(mockPurpose);
					expect(result.code).toBe(testCase.code);

					vi.clearAllMocks();
				}
			});
		});

		describe('when consent purpose does not exist', () => {
			it('should create and return new consent purpose', async () => {
				const newMockPurpose = createMockConsentPurpose({
					code: 'new-purpose',
				});

				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockResolvedValue(newMockPurpose),
				};

				const registry = consentPurposeRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result =
					await registry.findOrCreateConsentPurposeByCode('new-purpose');

				expect(db.findFirst).toHaveBeenCalledWith('consentPurpose', {
					where: expect.any(Function),
				});

				expect(db.create).toHaveBeenCalledWith('consentPurpose', {
					id: 'cp_test_123',
					code: 'new-purpose',
				});

				expect(result).toEqual(newMockPurpose);
				expect(mockLogger.debug).toHaveBeenCalledWith(
					'Creating consent purpose',
					{
						code: 'new-purpose',
					}
				);
			});

			it('should create consent purpose with correct default values', async () => {
				const newMockPurpose = createMockConsentPurpose({
					code: 'test-defaults',
				});

				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockResolvedValue(newMockPurpose),
				};

				const registry = consentPurposeRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				await registry.findOrCreateConsentPurposeByCode('test-defaults');

				expect(db.create).toHaveBeenCalledWith('consentPurpose', {
					id: 'cp_test_123',
					code: 'test-defaults',
				});
			});

			it('should handle special consent purpose codes correctly', async () => {
				const specialCodes = [
					'strictly-necessary',
					'performance_analytics',
					'marketing.targeting',
					'social-media_integration',
					'third_party.advertising',
				];

				for (const code of specialCodes) {
					const mockPurpose = createMockConsentPurpose({
						code,
					});

					const db = {
						findFirst: vi.fn().mockResolvedValue(null),
						create: vi.fn().mockResolvedValue(mockPurpose),
					};

					const registry = consentPurposeRegistry({
						db,
						ctx: { logger: mockLogger },
					} as unknown as Registry);

					const result = await registry.findOrCreateConsentPurposeByCode(code);

					expect(db.create).toHaveBeenCalledWith('consentPurpose', {
						id: 'cp_test_123',
						code,
					});

					expect(result).toEqual(mockPurpose);

					vi.clearAllMocks();
				}
			});
		});

		describe('error handling', () => {
			it('should throw HTTPException when consent purpose creation fails', async () => {
				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockResolvedValue(null),
				};

				const registry = consentPurposeRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const promise =
					registry.findOrCreateConsentPurposeByCode('failed-code');

				await expect(promise).rejects.toBeInstanceOf(HTTPException);
				await expect(promise).rejects.toEqual(
					expect.objectContaining({
						message: 'Failed to create consent purpose',
						status: 500,
					})
				);
				const error = await registry
					.findOrCreateConsentPurposeByCode('failed-code')
					.catch((e: any) => e);
				expect(error.cause).toEqual(
					expect.objectContaining({
						code: 'PURPOSE_CREATION_FAILED',
						purposeCode: 'failed-code',
					})
				);

				expect(db.findFirst).toHaveBeenCalledWith('consentPurpose', {
					where: expect.any(Function),
				});

				expect(db.create).toHaveBeenCalledWith('consentPurpose', {
					id: 'cp_test_123',
					code: 'failed-code',
				});

				expect(mockLogger.debug).toHaveBeenCalledWith(
					'Creating consent purpose',
					{
						code: 'failed-code',
					}
				);
			});

			it('should throw HTTPException when consent purpose creation returns undefined', async () => {
				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockResolvedValue(undefined),
				};

				const registry = consentPurposeRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const promise =
					registry.findOrCreateConsentPurposeByCode('undefined-code');

				await expect(promise).rejects.toBeInstanceOf(HTTPException);
				await expect(promise).rejects.toEqual(
					expect.objectContaining({
						message: 'Failed to create consent purpose',
						status: 500,
					})
				);
				const error = await registry
					.findOrCreateConsentPurposeByCode('undefined-code')
					.catch((e: any) => e);
				expect(error.cause).toEqual(
					expect.objectContaining({
						code: 'PURPOSE_CREATION_FAILED',
						purposeCode: 'undefined-code',
					})
				);
			});

			it('should propagate database findFirst errors', async () => {
				const dbError = new Error('Database connection failed');
				const db = {
					findFirst: vi.fn().mockRejectedValue(dbError),
				};

				const registry = consentPurposeRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const promise = registry.findOrCreateConsentPurposeByCode('error-code');

				await expect(promise).rejects.toThrow('Database connection failed');
			});

			it('should propagate database create errors', async () => {
				const dbError = new Error('Create operation failed');
				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockRejectedValue(dbError),
				};

				const registry = consentPurposeRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const promise =
					registry.findOrCreateConsentPurposeByCode('create-error-code');

				await expect(promise).rejects.toThrow('Create operation failed');
			});
		});
	});

	describe('database query construction', () => {
		it('should construct correct query for consent purpose lookup by code', async () => {
			const db = {
				findFirst: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockResolvedValue(createMockConsentPurpose()),
			};

			const registry = consentPurposeRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			await registry.findOrCreateConsentPurposeByCode('query-test-code');

			expect(db.findFirst).toHaveBeenCalledWith('consentPurpose', {
				where: expect.any(Function),
			});

			// Verify the where function is properly constructed
			const whereCall = db.findFirst.mock.calls[0]?.[1];
			expect(whereCall).toHaveProperty('where');
			expect(typeof whereCall?.where).toBe('function');
		});
	});

	describe('edge cases', () => {
		it('should handle consent purpose codes with various formats', async () => {
			const edgeCaseCodes = [
				'a', // Single character
				'very-long-consent-purpose-code-name', // Long code
				'CODE_WITH_UNDERSCORES', // Uppercase with underscores
				'mixed.Case-code_123', // Mixed case with special chars
			];

			for (const code of edgeCaseCodes) {
				const mockPurpose = createMockConsentPurpose({
					code,
				});

				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockResolvedValue(mockPurpose),
				};

				const registry = consentPurposeRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.findOrCreateConsentPurposeByCode(code);

				expect(result.code).toBe(code);

				vi.clearAllMocks();
			}
		});

		it('should maintain code case sensitivity', async () => {
			const mixedCaseCode = 'Analytics_Tracking';
			const mockPurpose = createMockConsentPurpose({
				code: mixedCaseCode,
			});

			const db = {
				findFirst: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockResolvedValue(mockPurpose),
			};

			const registry = consentPurposeRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			const result =
				await registry.findOrCreateConsentPurposeByCode(mixedCaseCode);

			expect(db.create).toHaveBeenCalledWith('consentPurpose', {
				id: 'cp_test_123',
				code: mixedCaseCode,
			});

			expect(result.code).toBe(mixedCaseCode);
		});

		it('should handle empty string code gracefully', async () => {
			const mockPurpose = createMockConsentPurpose({
				code: '',
			});

			const db = {
				findFirst: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockResolvedValue(mockPurpose),
			};

			const registry = consentPurposeRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			const result = await registry.findOrCreateConsentPurposeByCode('');

			expect(db.create).toHaveBeenCalledWith('consentPurpose', {
				id: 'cp_test_123',
				code: '',
			});

			expect(result.code).toBe('');
		});
	});
});
