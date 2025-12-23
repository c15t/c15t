import { ORPCError } from '@orpc/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock the oRPC handler before importing
vi.mock('~/contracts', () => ({
	os: {
		consent: {
			identify: {
				handler: (fn: unknown) => fn,
			},
		},
	},
}));

// Mock generateUniqueId
vi.mock('~/db/registry/utils', () => ({
	generateUniqueId: vi.fn().mockResolvedValue('aud_test_123'),
}));

import { identifyUser } from './identify.handler';

describe('identifyUser handler', () => {
	const mockLogger = {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	};

	const createMockContext = (db: unknown) => {
		return {
			context: {
				db,
				logger: mockLogger,
				ipAddress: '192.168.1.100',
				userAgent: 'Mozilla/5.0',
			},
			input: {
				consentId: 'cns_test_123',
				externalId: 'ext_user_456',
			},
		};
	};

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('when consent is not found', () => {
		it('should throw CONSENT_NOT_FOUND error', async () => {
			const db = {
				findFirst: vi.fn().mockResolvedValue(null),
			};

			await expect(
				//@ts-expect-error - simplified test context
				identifyUser(createMockContext(db))
			).rejects.toBeInstanceOf(ORPCError);

			await expect(
				//@ts-expect-error - simplified test context
				identifyUser(createMockContext(db))
			).rejects.toEqual(
				expect.objectContaining({
					code: 'CONSENT_NOT_FOUND',
					data: {
						consentId: 'cns_test_123',
					},
				})
			);
		});
	});

	describe('when no duplicate externalId exists', () => {
		it('should update the subject with externalId normally', async () => {
			const mockConsent = {
				id: 'cns_test_123',
				subjectId: 'sub_current_789',
			};

			const tx = {
				findFirst: vi.fn().mockResolvedValue(null), // No duplicate subject
				updateMany: vi.fn().mockResolvedValue(undefined),
				create: vi.fn().mockResolvedValue({ id: 'aud_test_123' }),
			};

			const mockTransaction = vi.fn(async (callback) => {
				return await callback(tx);
			});

			const db = {
				findFirst: vi.fn().mockResolvedValue(mockConsent),
				transaction: mockTransaction,
			};

			//@ts-expect-error - simplified test context
			const result = await identifyUser(createMockContext(db));

			expect(result).toEqual({ success: true });

			// Verify consent was looked up
			expect(db.findFirst).toHaveBeenCalledWith('consent', {
				where: expect.any(Function),
			});

			// Verify transaction was called
			expect(mockTransaction).toHaveBeenCalledTimes(1);

			// Verify duplicate check
			expect(tx.findFirst).toHaveBeenCalledWith('subject', {
				where: expect.any(Function),
			});

			// Verify subject update
			expect(tx.updateMany).toHaveBeenCalledWith('subject', {
				where: expect.any(Function),
				set: {
					externalId: 'ext_user_456',
					identityProvider: 'external',
					isIdentified: true,
					updatedAt: expect.any(Date),
				},
			});

			// Verify audit log creation
			expect(tx.create).toHaveBeenCalledWith('auditLog', {
				id: 'aud_test_123',
				subjectId: 'sub_current_789',
				entityType: 'consent',
				entityId: 'cns_test_123',
				actionType: 'identify_user',
				ipAddress: '192.168.1.100',
				userAgent: 'Mozilla/5.0',
				eventTimezone: 'UTC',
				metadata: {
					externalId: 'ext_user_456',
					identityProvider: 'external',
				},
			});
		});
	});

	describe('when duplicate externalId exists', () => {
		it('should merge subjects and update all related records', async () => {
			const mockConsent = {
				id: 'cns_test_123',
				subjectId: 'sub_current_789',
			};

			const existingSubject = {
				id: 'sub_existing_123',
				externalId: 'ext_user_456',
				isIdentified: true,
			};

			const tx = {
				findFirst: vi.fn().mockResolvedValue(existingSubject),
				updateMany: vi.fn().mockResolvedValue(undefined),
				deleteMany: vi.fn().mockResolvedValue(undefined),
				create: vi.fn().mockResolvedValue({ id: 'aud_test_123' }),
			};

			const mockTransaction = vi.fn(async (callback) => {
				return await callback(tx);
			});

			const db = {
				findFirst: vi.fn().mockResolvedValue(mockConsent),
				transaction: mockTransaction,
			};

			//@ts-expect-error - simplified test context
			const result = await identifyUser(createMockContext(db));

			expect(result).toEqual({ success: true });

			// Verify transaction was called
			expect(mockTransaction).toHaveBeenCalledTimes(1);

			// Verify duplicate check was performed
			expect(tx.findFirst).toHaveBeenCalledWith('subject', {
				where: expect.any(Function),
			});

			// Verify initial logging
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Handling identify-user request'
			);

			// Verify merge logging
			expect(mockLogger.info).toHaveBeenCalledWith('Merging subjects', {
				currentSubjectId: 'sub_current_789',
				oldSubjectId: 'sub_existing_123',
				externalId: 'ext_user_456',
				identityProvider: 'external',
			});

			// Verify consent records were updated
			expect(tx.updateMany).toHaveBeenCalledWith('consent', {
				where: expect.any(Function),
				set: {
					subjectId: 'sub_existing_123',
				},
			});

			// Verify consentRecord records were updated
			expect(tx.updateMany).toHaveBeenCalledWith('consentRecord', {
				where: expect.any(Function),
				set: {
					subjectId: 'sub_existing_123',
				},
			});

			// Verify auditLog records were updated
			expect(tx.updateMany).toHaveBeenCalledWith('auditLog', {
				where: expect.any(Function),
				set: {
					subjectId: 'sub_existing_123',
				},
			});

			// Verify current subject was deleted
			expect(tx.deleteMany).toHaveBeenCalledWith('subject', {
				where: expect.any(Function),
			});

			// Verify audit log creation with merged metadata
			expect(tx.create).toHaveBeenCalledWith('auditLog', {
				id: 'aud_test_123',
				subjectId: 'sub_existing_123',
				entityType: 'consent',
				entityId: 'cns_test_123',
				actionType: 'identify_user',
				ipAddress: '192.168.1.100',
				userAgent: 'Mozilla/5.0',
				eventTimezone: 'UTC',
				metadata: {
					externalId: 'ext_user_456',
					identityProvider: 'external',
					mergedFrom: 'sub_current_789',
				},
			});

			// Verify subject was NOT updated (should go through merge path)
			const updateCalls = tx.updateMany.mock.calls.filter(
				(call) => call[0] === 'subject' && call[1].set?.externalId
			);
			expect(updateCalls.length).toBe(0);
		});

		it('should not merge if the existing subject is the same as current subject', async () => {
			const mockConsent = {
				id: 'cns_test_123',
				subjectId: 'sub_current_789',
			};

			// This should not be found because we exclude current subjectId
			const tx = {
				findFirst: vi.fn().mockResolvedValue(null), // No duplicate (excludes current)
				updateMany: vi.fn().mockResolvedValue(undefined),
				deleteMany: vi.fn().mockResolvedValue(undefined),
				create: vi.fn().mockResolvedValue({ id: 'aud_test_123' }),
			};

			const mockTransaction = vi.fn(async (callback) => {
				return await callback(tx);
			});

			const db = {
				findFirst: vi.fn().mockResolvedValue(mockConsent),
				transaction: mockTransaction,
			};

			//@ts-expect-error - simplified test context
			const result = await identifyUser(createMockContext(db));

			expect(result).toEqual({ success: true });

			// Verify it went through normal update path (not merge)
			expect(tx.updateMany).toHaveBeenCalledWith('subject', {
				where: expect.any(Function),
				set: expect.objectContaining({
					externalId: 'ext_user_456',
					identityProvider: 'external',
					isIdentified: true,
				}),
			});

			// Verify deleteMany was NOT called
			expect(tx.deleteMany).not.toHaveBeenCalled();
		});
	});

	describe('edge cases', () => {
		it('should handle transaction errors gracefully', async () => {
			const mockConsent = {
				id: 'cns_test_123',
				subjectId: 'sub_current_789',
			};

			const db = {
				findFirst: vi.fn().mockResolvedValue(mockConsent),
				transaction: vi.fn().mockRejectedValue(new Error('Transaction failed')),
			};

			await expect(
				//@ts-expect-error - simplified test context
				identifyUser(createMockContext(db))
			).rejects.toThrow('Transaction failed');
		});

		it('should handle null ipAddress and userAgent', async () => {
			const mockConsent = {
				id: 'cns_test_123',
				subjectId: 'sub_current_789',
			};

			const tx = {
				findFirst: vi.fn().mockResolvedValue(null),
				updateMany: vi.fn().mockResolvedValue(undefined),
				create: vi.fn().mockResolvedValue({ id: 'aud_test_123' }),
			};

			const mockTransaction = vi.fn(async (callback) => {
				return await callback(tx);
			});

			const db = {
				findFirst: vi.fn().mockResolvedValue(mockConsent),
				transaction: mockTransaction,
			};

			const context = {
				context: {
					db,
					logger: mockLogger,
					ipAddress: null,
					userAgent: null,
				},
				input: {
					consentId: 'cns_test_123',
					externalId: 'ext_user_456',
				},
			};

			//@ts-expect-error - simplified test context
			const result = await identifyUser(context);

			expect(result).toEqual({ success: true });

			// Verify audit log accepts null values
			expect(tx.create).toHaveBeenCalledWith('auditLog', {
				id: 'aud_test_123',
				subjectId: 'sub_current_789',
				entityType: 'consent',
				entityId: 'cns_test_123',
				actionType: 'identify_user',
				ipAddress: null,
				userAgent: null,
				eventTimezone: 'UTC',
				metadata: {
					externalId: 'ext_user_456',
					identityProvider: 'external',
				},
			});
		});

		it('should correctly identify where clauses for duplicate check', async () => {
			const mockConsent = {
				id: 'cns_test_123',
				subjectId: 'sub_current_789',
			};

			let capturedWhereClause: unknown;

			const tx = {
				findFirst: vi.fn((table, options) => {
					if (table === 'subject') {
						capturedWhereClause = options.where;
					}
					return Promise.resolve(null);
				}),
				updateMany: vi.fn().mockResolvedValue(undefined),
				create: vi.fn().mockResolvedValue({ id: 'aud_test_123' }),
			};

			const mockTransaction = vi.fn(async (callback) => {
				return await callback(tx);
			});

			const db = {
				findFirst: vi.fn().mockResolvedValue(mockConsent),
				transaction: mockTransaction,
			};

			//@ts-expect-error - simplified test context
			await identifyUser(createMockContext(db));

			// Verify the where clause function exists and can be called
			expect(capturedWhereClause).toBeDefined();
			expect(typeof capturedWhereClause).toBe('function');
		});

		it('should update multiple consent records when merging', async () => {
			const mockConsent = {
				id: 'cns_test_123',
				subjectId: 'sub_current_789',
			};

			const existingSubject = {
				id: 'sub_existing_123',
				externalId: 'ext_user_456',
			};

			const updateManyCalls: Array<[string, unknown]> = [];

			const tx = {
				findFirst: vi.fn().mockResolvedValue(existingSubject),
				updateMany: vi.fn((table, options) => {
					updateManyCalls.push([table, options]);
					return Promise.resolve(undefined);
				}),
				deleteMany: vi.fn().mockResolvedValue(undefined),
				create: vi.fn().mockResolvedValue({ id: 'aud_test_123' }),
			};

			const mockTransaction = vi.fn(async (callback) => {
				return await callback(tx);
			});

			const db = {
				findFirst: vi.fn().mockResolvedValue(mockConsent),
				transaction: mockTransaction,
			};

			//@ts-expect-error - simplified test context
			await identifyUser(createMockContext(db));

			// Verify all three tables were updated
			const updatedTables = updateManyCalls.map((call) => call[0]);
			expect(updatedTables).toContain('consent');
			expect(updatedTables).toContain('consentRecord');
			expect(updatedTables).toContain('auditLog');

			// Verify all updates point to the old subject ID
			for (const [table, options] of updateManyCalls) {
				if (table !== 'subject') {
					expect(options).toHaveProperty('set.subjectId', 'sub_existing_123');
				}
			}
		});
	});
});
