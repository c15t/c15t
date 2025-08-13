import { ORPCError } from '@orpc/server';
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
		name: 'marketing',
		description: 'Auto-created consentPurpose for marketing',
		isEssential: false,
		dataCategory: null,
		legalBasis: 'consent',
		isActive: true,
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
					name: 'Analytics',
					description: 'Analytics and performance tracking',
					isEssential: true,
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
					{
						code: 'essential',
						name: 'Essential',
						isEssential: true,
						legalBasis: 'legitimate_interest',
					},
					{
						code: 'preferences',
						name: 'User Preferences',
						isEssential: false,
						legalBasis: 'consent',
					},
					{
						code: 'functional',
						name: 'Functional Cookies',
						isEssential: false,
						legalBasis: 'consent',
						dataCategory: 'functional',
					},
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
					expect(result.isEssential).toBe(testCase.isEssential);
					expect(result.legalBasis).toBe(testCase.legalBasis);

					vi.clearAllMocks();
				}
			});
		});

		describe('when consent purpose does not exist', () => {
			it('should create and return new consent purpose', async () => {
				const newMockPurpose = createMockConsentPurpose({
					code: 'new-purpose',
					name: 'new-purpose',
					description: 'Auto-created consentPurpose for new-purpose',
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
					name: 'new-purpose',
					description: 'Auto-created consentPurpose for new-purpose',
					isActive: true,
					isEssential: false,
					legalBasis: 'consent',
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
					name: 'test-defaults',
					description: 'Auto-created consentPurpose for test-defaults',
					isActive: true,
					isEssential: false,
					legalBasis: 'consent',
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
						name: code,
						description: `Auto-created consentPurpose for ${code}`,
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
						name: code,
						description: `Auto-created consentPurpose for ${code}`,
						isActive: true,
						isEssential: false,
						legalBasis: 'consent',
					});

					expect(result).toEqual(mockPurpose);

					vi.clearAllMocks();
				}
			});
		});

		describe('error handling', () => {
			it('should throw ORPCError when consent purpose creation fails', async () => {
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

				await expect(promise).rejects.toBeInstanceOf(ORPCError);
				await expect(promise).rejects.toEqual(
					expect.objectContaining({
						message: 'Failed to create consent purpose',
						code: 'PURPOSE_CREATION_FAILED',
						status: 500,
						data: { purposeCode: 'failed-code' },
					})
				);

				expect(db.findFirst).toHaveBeenCalledWith('consentPurpose', {
					where: expect.any(Function),
				});

				expect(db.create).toHaveBeenCalledWith('consentPurpose', {
					id: 'cp_test_123',
					code: 'failed-code',
					name: 'failed-code',
					description: 'Auto-created consentPurpose for failed-code',
					isActive: true,
					isEssential: false,
					legalBasis: 'consent',
				});

				expect(mockLogger.debug).toHaveBeenCalledWith(
					'Creating consent purpose',
					{
						code: 'failed-code',
					}
				);
			});

			it('should throw ORPCError when consent purpose creation returns undefined', async () => {
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

				await expect(promise).rejects.toBeInstanceOf(ORPCError);
				await expect(promise).rejects.toEqual(
					expect.objectContaining({
						message: 'Failed to create consent purpose',
						code: 'PURPOSE_CREATION_FAILED',
						status: 500,
						data: { purposeCode: 'undefined-code' },
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
				'数据处理', // Unicode/international characters
			];

			for (const code of edgeCaseCodes) {
				const mockPurpose = createMockConsentPurpose({
					code,
					name: code,
					description: `Auto-created consentPurpose for ${code}`,
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
				expect(result.name).toBe(code);
				expect(result.description).toBe(
					`Auto-created consentPurpose for ${code}`
				);

				vi.clearAllMocks();
			}
		});

		it('should maintain code case sensitivity', async () => {
			const mixedCaseCode = 'Analytics_Tracking';
			const mockPurpose = createMockConsentPurpose({
				code: mixedCaseCode,
				name: mixedCaseCode,
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
				name: mixedCaseCode,
				description: `Auto-created consentPurpose for ${mixedCaseCode}`,
				isActive: true,
				isEssential: false,
				legalBasis: 'consent',
			});

			expect(result.code).toBe(mixedCaseCode);
		});

		it('should handle empty string code gracefully', async () => {
			const mockPurpose = createMockConsentPurpose({
				code: '',
				name: '',
				description: 'Auto-created consentPurpose for ',
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
				name: '',
				description: 'Auto-created consentPurpose for ',
				isActive: true,
				isEssential: false,
				legalBasis: 'consent',
			});

			expect(result.code).toBe('');
		});
	});
});
