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

import { identifyUser } from './identify.handler';

describe('identifyUser handler (v1)', () => {
	const mockLogger = {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	};

	const createMockContext = (adapter: unknown, options = {}) => {
		return {
			context: {
				adapter,
				logger: mockLogger,
				ipAddress: '192.168.1.100',
				userAgent: 'Mozilla/5.0',
				options: {},
				...options,
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
			const adapter = {
				findOne: vi.fn().mockResolvedValue(null),
			};

			await expect(
				//@ts-expect-error - simplified test context
				identifyUser(createMockContext(adapter))
			).rejects.toBeInstanceOf(ORPCError);

			await expect(
				//@ts-expect-error - simplified test context
				identifyUser(createMockContext(adapter))
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
				domainId: 'dom_test_456',
				purposeIds: ['pur_test_1'],
			};

			const tx = {
				findOne: vi.fn().mockResolvedValue(null), // No duplicate subject
				update: vi.fn().mockResolvedValue({ id: 'sub_current_789' }),
				create: vi.fn().mockResolvedValue({ id: 'aud_test_123' }),
			};

			const mockTransaction = vi.fn(async (data) => {
				return await data.callback(tx);
			});

			const adapter = {
				findOne: vi.fn().mockResolvedValue(mockConsent),
				transaction: mockTransaction,
			};

			//@ts-expect-error - simplified test context
			const result = await identifyUser(createMockContext(adapter));

			expect(result).toEqual({ success: true });

			// Verify consent was looked up
			expect(adapter.findOne).toHaveBeenCalledWith({
				model: 'consent',
				where: [
					{
						field: 'id',
						value: 'cns_test_123',
					},
				],
			});

			// Verify transaction was called
			expect(mockTransaction).toHaveBeenCalledTimes(1);

			// Verify duplicate check
			expect(tx.findOne).toHaveBeenCalledWith({
				model: 'subject',
				where: expect.arrayContaining([
					expect.objectContaining({
						field: 'externalId',
						value: 'ext_user_456',
					}),
				]),
			});

			// Verify subject update
			expect(tx.update).toHaveBeenCalledWith({
				model: 'subject',
				where: [
					{
						field: 'id',
						value: 'sub_current_789',
					},
				],
				update: {
					externalId: 'ext_user_456',
					identityProvider: 'external',
					isIdentified: true,
					updatedAt: expect.any(Date),
				},
			});

			// Verify audit log creation
			expect(tx.create).toHaveBeenCalledWith({
				model: 'auditLog',
				data: {
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
				},
			});
		});
	});

	describe('when duplicate externalId exists', () => {
		it('should merge subjects and update all related records', async () => {
			const mockConsent = {
				id: 'cns_test_123',
				subjectId: 'sub_current_789',
				domainId: 'dom_test_456',
				purposeIds: ['pur_test_1'],
			};

			const existingSubject = {
				id: 'sub_existing_123',
				externalId: 'ext_user_456',
				isIdentified: true,
			};

			const tx = {
				findOne: vi.fn().mockResolvedValue(existingSubject),
				update: vi.fn().mockResolvedValue(null),
				updateMany: vi.fn().mockResolvedValue([]),
				deleteMany: vi.fn().mockResolvedValue(1),
				create: vi.fn().mockResolvedValue({ id: 'aud_test_123' }),
			};

			const mockTransaction = vi.fn(async (data) => {
				return await data.callback(tx);
			});

			const adapter = {
				findOne: vi.fn().mockResolvedValue(mockConsent),
				transaction: mockTransaction,
			};

			//@ts-expect-error - simplified test context
			const result = await identifyUser(createMockContext(adapter));

			expect(result).toEqual({ success: true });

			// Verify transaction was called
			expect(mockTransaction).toHaveBeenCalledTimes(1);

			// Verify duplicate check was performed
			expect(tx.findOne).toHaveBeenCalledWith({
				model: 'subject',
				where: expect.arrayContaining([
					expect.objectContaining({
						field: 'externalId',
						value: 'ext_user_456',
					}),
				]),
			});

			// Verify merge logging
			expect(mockLogger.info).toHaveBeenCalledWith('Merging subjects', {
				currentSubjectId: 'sub_current_789',
				oldSubjectId: 'sub_existing_123',
				externalId: 'ext_user_456',
			});

			// Verify consent records were updated
			expect(tx.updateMany).toHaveBeenCalledWith({
				model: 'consent',
				where: [
					{
						field: 'subjectId',
						value: 'sub_current_789',
					},
				],
				update: {
					subjectId: 'sub_existing_123',
				},
			});

			// Verify consentRecord records were updated
			expect(tx.updateMany).toHaveBeenCalledWith({
				model: 'consentRecord',
				where: [
					{
						field: 'subjectId',
						value: 'sub_current_789',
					},
				],
				update: {
					subjectId: 'sub_existing_123',
				},
			});

			// Verify auditLog records were updated
			expect(tx.updateMany).toHaveBeenCalledWith({
				model: 'auditLog',
				where: [
					{
						field: 'subjectId',
						value: 'sub_current_789',
					},
				],
				update: {
					subjectId: 'sub_existing_123',
				},
			});

			// Verify current subject was deleted
			expect(tx.deleteMany).toHaveBeenCalledWith({
				model: 'subject',
				where: [
					{
						field: 'id',
						value: 'sub_current_789',
					},
				],
			});

			// Verify audit log creation with merged metadata
			expect(tx.create).toHaveBeenCalledWith({
				model: 'auditLog',
				data: {
					subjectId: 'sub_existing_123',
					entityType: 'consent',
					entityId: 'cns_test_123',
					actionType: 'identify_user',
					ipAddress: '192.168.1.100',
					userAgent: 'Mozilla/5.0',
					eventTimezone: 'UTC',
					metadata: {
						externalId: 'ext_user_456',
						mergedFrom: 'sub_current_789',
					},
				},
			});

			// Verify subject was NOT updated (should go through merge path)
			expect(tx.update).not.toHaveBeenCalled();
		});

		it('should not merge if the existing subject is the same as current subject', async () => {
			const mockConsent = {
				id: 'cns_test_123',
				subjectId: 'sub_current_789',
				domainId: 'dom_test_456',
				purposeIds: ['pur_test_1'],
			};

			// This should not be found because we exclude current subjectId
			const tx = {
				findOne: vi.fn().mockResolvedValue(null), // No duplicate (excludes current)
				update: vi.fn().mockResolvedValue({ id: 'sub_current_789' }),
				updateMany: vi.fn().mockResolvedValue([]),
				deleteMany: vi.fn().mockResolvedValue(0),
				create: vi.fn().mockResolvedValue({ id: 'aud_test_123' }),
			};

			const mockTransaction = vi.fn(async (data) => {
				return await data.callback(tx);
			});

			const adapter = {
				findOne: vi.fn().mockResolvedValue(mockConsent),
				transaction: mockTransaction,
			};

			//@ts-expect-error - simplified test context
			const result = await identifyUser(createMockContext(adapter));

			expect(result).toEqual({ success: true });

			// Verify it went through normal update path (not merge)
			expect(tx.update).toHaveBeenCalledWith({
				model: 'subject',
				where: [
					{
						field: 'id',
						value: 'sub_current_789',
					},
				],
				update: expect.objectContaining({
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
				domainId: 'dom_test_456',
				purposeIds: ['pur_test_1'],
			};

			const adapter = {
				findOne: vi.fn().mockResolvedValue(mockConsent),
				transaction: vi.fn().mockRejectedValue(new Error('Transaction failed')),
			};

			await expect(
				//@ts-expect-error - simplified test context
				identifyUser(createMockContext(adapter))
			).rejects.toThrow('Transaction failed');
		});

		it('should handle null ipAddress and userAgent', async () => {
			const mockConsent = {
				id: 'cns_test_123',
				subjectId: 'sub_current_789',
				domainId: 'dom_test_456',
				purposeIds: ['pur_test_1'],
			};

			const tx = {
				findOne: vi.fn().mockResolvedValue(null),
				update: vi.fn().mockResolvedValue({ id: 'sub_current_789' }),
				create: vi.fn().mockResolvedValue({ id: 'aud_test_123' }),
			};

			const mockTransaction = vi.fn(async (data) => {
				return await data.callback(tx);
			});

			const adapter = {
				findOne: vi.fn().mockResolvedValue(mockConsent),
				transaction: mockTransaction,
			};

			const context = createMockContext(adapter, {
				ipAddress: null,
				userAgent: null,
			});

			//@ts-expect-error - simplified test context
			const result = await identifyUser(context);

			expect(result).toEqual({ success: true });

			// Verify audit log accepts null values
			expect(tx.create).toHaveBeenCalledWith({
				model: 'auditLog',
				data: {
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
				},
			});
		});

		it('should update multiple consent records when merging', async () => {
			const mockConsent = {
				id: 'cns_test_123',
				subjectId: 'sub_current_789',
				domainId: 'dom_test_456',
				purposeIds: ['pur_test_1'],
			};

			const existingSubject = {
				id: 'sub_existing_123',
				externalId: 'ext_user_456',
			};

			const updateManyCalls: Array<[string, unknown]> = [];

			const tx = {
				findOne: vi.fn().mockResolvedValue(existingSubject),
				updateMany: vi.fn((data) => {
					updateManyCalls.push([data.model, data]);
					return Promise.resolve([]);
				}),
				deleteMany: vi.fn().mockResolvedValue(1),
				create: vi.fn().mockResolvedValue({ id: 'aud_test_123' }),
			};

			const mockTransaction = vi.fn(async (data) => {
				return await data.callback(tx);
			});

			const adapter = {
				findOne: vi.fn().mockResolvedValue(mockConsent),
				transaction: mockTransaction,
			};

			//@ts-expect-error - simplified test context
			await identifyUser(createMockContext(adapter));

			// Verify all three tables were updated
			const updatedTables = updateManyCalls.map((call) => call[0]);
			expect(updatedTables).toContain('consent');
			expect(updatedTables).toContain('consentRecord');
			expect(updatedTables).toContain('auditLog');

			// Verify all updates point to the old subject ID
			for (const [table, options] of updateManyCalls) {
				if (table !== 'subject') {
					expect(options).toHaveProperty(
						'update.subjectId',
						'sub_existing_123'
					);
				}
			}
		});
	});
});
