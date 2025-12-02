import { ORPCError } from '@orpc/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Consent } from '../schema';
import { consentRegistry } from './consent';
import type { Registry } from './types';

// Mock generateUniqueId to return a predictable value for assertions
vi.mock('./utils/generate-id', () => ({
	generateUniqueId: vi.fn().mockResolvedValue('cns_test_123'),
}));

const CONSENT_ID_PATTERN = /^cns_/;

describe('consentRegistry', () => {
	const mockLogger = {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	};

	/**
	 * Creates a mock consent object with the specified overrides
	 *
	 * @param overrides - Partial consent properties to override defaults
	 * @returns A complete Consent object for testing
	 */
	const createMockConsent = (overrides: Partial<Consent> = {}): Consent => ({
		id: 'cns_test_123',
		subjectId: 'sub_test_456',
		domainId: 'dom_test_789',
		policyId: 'pol_test_012',
		purposeIds: ['pur_analytics', 'pur_marketing'],
		metadata: { source: 'banner', version: '1.0' },
		ipAddress: '192.168.1.100',
		userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
		status: 'active',
		withdrawalReason: null,
		givenAt: new Date('2024-01-01T00:00:00.000Z'),
		validUntil: new Date('2025-01-01T00:00:00.000Z'),
		isActive: true,
		...overrides,
	});

	/**
	 * Creates minimal consent input for testing creation
	 *
	 * @param overrides - Partial consent input properties to override defaults
	 * @returns Consent input without id and createdAt
	 */
	const createConsentInput = (
		overrides: Partial<Omit<Consent, 'id' | 'createdAt'>> = {}
	): Omit<Consent, 'id' | 'createdAt'> => ({
		subjectId: 'sub_test_456',
		domainId: 'dom_test_789',
		policyId: 'pol_test_012',
		purposeIds: ['pur_analytics', 'pur_marketing'],
		metadata: { source: 'banner', version: '1.0' },
		ipAddress: '192.168.1.100',
		userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
		status: 'active',
		withdrawalReason: null,
		givenAt: new Date('2024-01-01T00:00:00.000Z'),
		validUntil: new Date('2025-01-01T00:00:00.000Z'),
		isActive: true,
		...overrides,
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('createConsent', () => {
		it('should create consent with all required fields', async () => {
			const consentInput = createConsentInput();
			const mockConsent = createMockConsent();

			const db = {
				create: vi.fn().mockResolvedValue(mockConsent),
			};

			const registry = consentRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			const result = await registry.createConsent(consentInput);

			expect(db.create).toHaveBeenCalledWith('consent', {
				id: 'cns_test_123',
				subjectId: 'sub_test_456',
				domainId: 'dom_test_789',
				policyId: 'pol_test_012',
				purposeIds: ['pur_analytics', 'pur_marketing'],
				metadata: { source: 'banner', version: '1.0' },
				ipAddress: '192.168.1.100',
				userAgent:
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				status: 'active',
				givenAt: new Date('2024-01-01T00:00:00.000Z'),
				isActive: true,
			});

			expect(result).toEqual(mockConsent);
			expect(mockLogger.debug).toHaveBeenCalledWith('Creating consent', {
				consent: consentInput,
			});
		});

		it('should create consent with minimal required fields', async () => {
			const minimalInput = createConsentInput({
				policyId: undefined,
				metadata: undefined,
				ipAddress: undefined,
				userAgent: undefined,
				withdrawalReason: undefined,
				validUntil: undefined,
			});

			const mockConsent = createMockConsent({
				policyId: undefined,
				metadata: undefined,
				ipAddress: undefined,
				userAgent: undefined,
				withdrawalReason: undefined,
				validUntil: undefined,
			});

			const db = {
				create: vi.fn().mockResolvedValue(mockConsent),
			};

			const registry = consentRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			const result = await registry.createConsent(minimalInput);

			expect(db.create).toHaveBeenCalledWith('consent', {
				id: 'cns_test_123',
				subjectId: 'sub_test_456',
				domainId: 'dom_test_789',
				policyId: undefined,
				purposeIds: ['pur_analytics', 'pur_marketing'],
				metadata: undefined,
				ipAddress: undefined,
				userAgent: undefined,
				status: 'active',
				givenAt: new Date('2024-01-01T00:00:00.000Z'),
				isActive: true,
			});

			expect(result).toEqual(mockConsent);
		});

		it('should handle all valid consent statuses', async () => {
			const validStatuses = ['active', 'withdrawn', 'expired'] as const;

			for (const status of validStatuses) {
				const consentInput = createConsentInput({ status });
				const mockConsent = createMockConsent({ status });

				const db = {
					create: vi.fn().mockResolvedValue(mockConsent),
				};

				const registry = consentRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.createConsent(consentInput);

				expect(db.create).toHaveBeenCalledWith('consent', {
					id: 'cns_test_123',
					subjectId: 'sub_test_456',
					domainId: 'dom_test_789',
					policyId: 'pol_test_012',
					purposeIds: ['pur_analytics', 'pur_marketing'],
					metadata: { source: 'banner', version: '1.0' },
					ipAddress: '192.168.1.100',
					userAgent:
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
					status,
					givenAt: new Date('2024-01-01T00:00:00.000Z'),
					isActive: true,
				});

				expect(result.status).toBe(status);

				vi.clearAllMocks();
			}
		});

		it('should handle different purposeIds arrays', async () => {
			const testCases = [
				{
					name: 'single purpose',
					purposeIds: ['pur_essential'],
				},
				{
					name: 'multiple purposes',
					purposeIds: [
						'pur_essential',
						'pur_analytics',
						'pur_marketing',
						'pur_functional',
					],
				},
				{
					name: 'empty purposes array',
					purposeIds: [],
				},
				{
					name: 'purposes with special characters',
					purposeIds: ['pur_analytics-v2', 'pur_marketing.targeted'],
				},
			];

			for (const testCase of testCases) {
				const consentInput = createConsentInput({
					purposeIds: testCase.purposeIds,
				});
				const mockConsent = createMockConsent({
					purposeIds: testCase.purposeIds,
				});

				const db = {
					create: vi.fn().mockResolvedValue(mockConsent),
				};

				const registry = consentRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.createConsent(consentInput);

				expect(result.purposeIds).toEqual(testCase.purposeIds);
				expect(db.create).toHaveBeenCalledWith(
					'consent',
					expect.objectContaining({
						purposeIds: testCase.purposeIds,
					})
				);

				vi.clearAllMocks();
			}
		});

		it('should handle different metadata structures', async () => {
			const testCases = [
				{
					name: 'null metadata',
					metadata: null,
				},
				{
					name: 'undefined metadata',
					metadata: undefined,
				},
				{
					name: 'simple metadata',
					metadata: { source: 'cookie_banner' },
				},
				{
					name: 'complex metadata',
					metadata: {
						source: 'cookie_banner',
						version: '2.1.0',
						campaign: 'gdpr_compliance',
						sessionId: 'sess_abc123',
						browserLanguage: 'en-US',
						timezone: 'America/New_York',
						customData: {
							userType: 'premium',
							experiment: 'variant_a',
						},
					},
				},
				{
					name: 'metadata with arrays',
					metadata: {
						tags: ['gdpr', 'cookie_consent'],
						features: ['analytics', 'personalization'],
					},
				},
			];

			for (const testCase of testCases) {
				const consentInput = createConsentInput({
					metadata: testCase.metadata,
				});
				const mockConsent = createMockConsent({
					metadata: testCase.metadata,
				});

				const db = {
					create: vi.fn().mockResolvedValue(mockConsent),
				};

				const registry = consentRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.createConsent(consentInput);

				expect(result.metadata).toEqual(testCase.metadata);
				expect(db.create).toHaveBeenCalledWith(
					'consent',
					expect.objectContaining({
						metadata: testCase.metadata,
					})
				);

				vi.clearAllMocks();
			}
		});

		it('should handle different IP address formats', async () => {
			const testCases = [
				{
					name: 'IPv4 address',
					ipAddress: '192.168.1.100',
				},
				{
					name: 'IPv6 address',
					ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
				},
				{
					name: 'localhost IPv4',
					ipAddress: '127.0.0.1',
				},
				{
					name: 'localhost IPv6',
					ipAddress: '::1',
				},
				{
					name: 'null IP address',
					ipAddress: null,
				},
				{
					name: 'undefined IP address',
					ipAddress: undefined,
				},
			];

			for (const testCase of testCases) {
				const consentInput = createConsentInput({
					ipAddress: testCase.ipAddress,
				});
				const mockConsent = createMockConsent({
					ipAddress: testCase.ipAddress,
				});

				const db = {
					create: vi.fn().mockResolvedValue(mockConsent),
				};

				const registry = consentRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.createConsent(consentInput);

				expect(result.ipAddress).toEqual(testCase.ipAddress);
				expect(db.create).toHaveBeenCalledWith(
					'consent',
					expect.objectContaining({
						ipAddress: testCase.ipAddress,
					})
				);

				vi.clearAllMocks();
			}
		});

		it('should handle different user agent strings', async () => {
			const testCases = [
				{
					name: 'Chrome on Windows',
					userAgent:
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
				},
				{
					name: 'Firefox on macOS',
					userAgent:
						'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0',
				},
				{
					name: 'Safari on iOS',
					userAgent:
						'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
				},
				{
					name: 'Mobile Chrome on Android',
					userAgent:
						'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
				},
				{
					name: 'null user agent',
					userAgent: null,
				},
				{
					name: 'undefined user agent',
					userAgent: undefined,
				},
			];

			for (const testCase of testCases) {
				const consentInput = createConsentInput({
					userAgent: testCase.userAgent,
				});
				const mockConsent = createMockConsent({
					userAgent: testCase.userAgent,
				});

				const db = {
					create: vi.fn().mockResolvedValue(mockConsent),
				};

				const registry = consentRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.createConsent(consentInput);

				expect(result.userAgent).toEqual(testCase.userAgent);
				expect(db.create).toHaveBeenCalledWith(
					'consent',
					expect.objectContaining({
						userAgent: testCase.userAgent,
					})
				);

				vi.clearAllMocks();
			}
		});

		it('should handle withdrawn consent with withdrawal reason', async () => {
			const consentInput = createConsentInput({
				status: 'withdrawn',
				withdrawalReason: 'User requested data deletion',
				isActive: false,
			});

			const mockConsent = createMockConsent({
				status: 'withdrawn',
				withdrawalReason: 'User requested data deletion',
				isActive: false,
			});

			const db = {
				create: vi.fn().mockResolvedValue(mockConsent),
			};

			const registry = consentRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			const result = await registry.createConsent(consentInput);

			expect(db.create).toHaveBeenCalledWith('consent', {
				id: 'cns_test_123',
				subjectId: 'sub_test_456',
				domainId: 'dom_test_789',
				policyId: 'pol_test_012',
				purposeIds: ['pur_analytics', 'pur_marketing'],
				metadata: { source: 'banner', version: '1.0' },
				ipAddress: '192.168.1.100',
				userAgent:
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				status: 'withdrawn',
				givenAt: new Date('2024-01-01T00:00:00.000Z'),
				isActive: false,
			});

			expect(result.status).toBe('withdrawn');
			expect(result.withdrawalReason).toBe('User requested data deletion');
			expect(result.isActive).toBe(false);
		});

		it('should handle expired consent', async () => {
			const pastDate = new Date('2023-01-01T00:00:00.000Z');
			const consentInput = createConsentInput({
				status: 'expired',
				validUntil: pastDate,
				isActive: false,
			});

			const mockConsent = createMockConsent({
				status: 'expired',
				validUntil: pastDate,
				isActive: false,
			});

			const db = {
				create: vi.fn().mockResolvedValue(mockConsent),
			};

			const registry = consentRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			const result = await registry.createConsent(consentInput);

			expect(result.status).toBe('expired');
			expect(result.validUntil).toEqual(pastDate);
			expect(result.isActive).toBe(false);
		});

		describe('error handling', () => {
			it('should throw ORPCError when consent creation fails', async () => {
				const consentInput = createConsentInput();

				const db = {
					create: vi.fn().mockResolvedValue(null),
				};

				const registry = consentRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const promise = registry.createConsent(consentInput);

				await expect(promise).rejects.toBeInstanceOf(ORPCError);
				await expect(promise).rejects.toEqual(
					expect.objectContaining({
						message: 'Failed to create consent - operation returned null',
						code: 'CONSENT_CREATION_FAILED',
						status: 500,
						data: { subjectId: 'sub_test_456', domainId: 'dom_test_789' },
					})
				);

				expect(db.create).toHaveBeenCalledWith('consent', {
					id: 'cns_test_123',
					subjectId: 'sub_test_456',
					domainId: 'dom_test_789',
					policyId: 'pol_test_012',
					purposeIds: ['pur_analytics', 'pur_marketing'],
					metadata: { source: 'banner', version: '1.0' },
					ipAddress: '192.168.1.100',
					userAgent:
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
					status: 'active',
					givenAt: new Date('2024-01-01T00:00:00.000Z'),
					isActive: true,
				});

				expect(mockLogger.debug).toHaveBeenCalledWith('Creating consent', {
					consent: consentInput,
				});
			});

			it('should throw ORPCError when consent creation returns undefined', async () => {
				const consentInput = createConsentInput();

				const db = {
					create: vi.fn().mockResolvedValue(undefined),
				};

				const registry = consentRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const promise = registry.createConsent(consentInput);

				await expect(promise).rejects.toBeInstanceOf(ORPCError);
				await expect(promise).rejects.toEqual(
					expect.objectContaining({
						message: 'Failed to create consent - operation returned null',
						code: 'CONSENT_CREATION_FAILED',
						status: 500,
						data: { subjectId: 'sub_test_456', domainId: 'dom_test_789' },
					})
				);
			});

			it('should propagate database create errors', async () => {
				const consentInput = createConsentInput();
				const dbError = new Error('Database connection failed');

				const db = {
					create: vi.fn().mockRejectedValue(dbError),
				};

				const registry = consentRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const promise = registry.createConsent(consentInput);

				await expect(promise).rejects.toThrow('Database connection failed');
				expect(mockLogger.debug).toHaveBeenCalledWith('Creating consent', {
					consent: consentInput,
				});
			});

			it('should handle generateUniqueId errors', async () => {
				const consentInput = createConsentInput();
				const idError = new Error('ID generation failed');

				// Mock generateUniqueId to throw an error
				const { generateUniqueId } = await import('./utils/generate-id');
				vi.mocked(generateUniqueId).mockRejectedValueOnce(idError);

				const db = {
					create: vi.fn(),
				};

				const registry = consentRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const promise = registry.createConsent(consentInput);

				await expect(promise).rejects.toThrow('ID generation failed');
				expect(db.create).not.toHaveBeenCalled();
			});
		});

		describe('database interaction', () => {
			it('should call create with correct table name and data structure', async () => {
				const consentInput = createConsentInput();
				const mockConsent = createMockConsent();

				const db = {
					create: vi.fn().mockResolvedValue(mockConsent),
				};

				const registry = consentRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				await registry.createConsent(consentInput);

				expect(db.create).toHaveBeenCalledTimes(1);
				expect(db.create).toHaveBeenCalledWith('consent', {
					id: expect.stringMatching(CONSENT_ID_PATTERN),
					subjectId: expect.any(String),
					domainId: expect.any(String),
					policyId: expect.any(String),
					purposeIds: expect.any(Array),
					metadata: expect.any(Object),
					ipAddress: expect.any(String),
					userAgent: expect.any(String),
					status: expect.any(String),
					givenAt: expect.any(Date),
					isActive: expect.any(Boolean),
				});
			});

			it('should preserve all input data in database call', async () => {
				const consentInput = createConsentInput({
					subjectId: 'sub_specific_test',
					givenAt: new Date(),
					domainId: 'dom_specific_test',
					policyId: 'pol_specific_test',
					purposeIds: ['pur_test1', 'pur_test2'],
					metadata: { custom: 'test_value' },
					ipAddress: '10.0.0.1',
					userAgent: 'Custom Test Agent',
					status: 'withdrawn',
					isActive: false,
				});

				const mockConsent = createMockConsent(consentInput);

				const db = {
					create: vi.fn().mockResolvedValue(mockConsent),
				};

				const registry = consentRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				await registry.createConsent(consentInput);

				expect(db.create).toHaveBeenCalledWith('consent', {
					id: 'cns_test_123',
					subjectId: 'sub_specific_test',
					domainId: 'dom_specific_test',
					policyId: 'pol_specific_test',
					purposeIds: ['pur_test1', 'pur_test2'],
					metadata: { custom: 'test_value' },
					ipAddress: '10.0.0.1',
					userAgent: 'Custom Test Agent',
					status: 'withdrawn',
					givenAt: expect.any(Date),
					isActive: false,
				});
			});
		});

		describe('edge cases', () => {
			it('should handle empty purposeIds array', async () => {
				const consentInput = createConsentInput({
					purposeIds: [],
				});

				const mockConsent = createMockConsent({
					purposeIds: [],
				});

				const db = {
					create: vi.fn().mockResolvedValue(mockConsent),
				};

				const registry = consentRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.createConsent(consentInput);

				expect(result.purposeIds).toEqual([]);
				expect(db.create).toHaveBeenCalledWith(
					'consent',
					expect.objectContaining({
						purposeIds: [],
					})
				);
			});

			it('should handle very long ID strings', async () => {
				const longIds = {
					subjectId: `sub_${'x'.repeat(200)}`,
					domainId: `dom_${'y'.repeat(200)}`,
					policyId: `pol_${'z'.repeat(200)}`,
				};

				const consentInput = createConsentInput(longIds);
				const mockConsent = createMockConsent(longIds);

				const db = {
					create: vi.fn().mockResolvedValue(mockConsent),
				};

				const registry = consentRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.createConsent(consentInput);

				expect(result.subjectId).toBe(longIds.subjectId);
				expect(result.domainId).toBe(longIds.domainId);
				expect(result.policyId).toBe(longIds.policyId);
			});

			it('should handle very large metadata objects', async () => {
				const largeMetadata = {
					description: 'x'.repeat(1000),
					tags: Array.from({ length: 100 }, (_, i) => `tag_${i}`),
					nestedData: {
						level1: {
							level2: {
								level3: {
									data: 'deep nested value',
									array: Array.from({ length: 50 }, (_, i) => ({
										id: i,
										value: `item_${i}`,
									})),
								},
							},
						},
					},
				};

				const consentInput = createConsentInput({
					metadata: largeMetadata,
				});

				const mockConsent = createMockConsent({
					metadata: largeMetadata,
				});

				const db = {
					create: vi.fn().mockResolvedValue(mockConsent),
				};

				const registry = consentRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.createConsent(consentInput);

				expect(result.metadata).toEqual(largeMetadata);
			});

			it('should handle consent creation with all null optional fields', async () => {
				const consentInput = createConsentInput({
					policyId: undefined,
					metadata: undefined,
					ipAddress: undefined,
					userAgent: undefined,
					withdrawalReason: undefined,
					validUntil: undefined,
				});

				const mockConsent = createMockConsent({
					policyId: undefined,
					metadata: undefined,
					ipAddress: undefined,
					userAgent: undefined,
					withdrawalReason: undefined,
					validUntil: undefined,
				});

				const db = {
					create: vi.fn().mockResolvedValue(mockConsent),
				};

				const registry = consentRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.createConsent(consentInput);

				expect(result.policyId).toBeUndefined();
				expect(result.metadata).toBeUndefined();
				expect(result.ipAddress).toBeUndefined();
				expect(result.userAgent).toBeUndefined();
				expect(result.withdrawalReason).toBeUndefined();
				expect(result.validUntil).toBeUndefined();
			});
		});
	});
});
