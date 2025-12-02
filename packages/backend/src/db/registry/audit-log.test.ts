import { ORPCError } from '@orpc/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuditLog } from '../schema';
import { auditLogRegistry } from './audit-log';
import type { Registry } from './types';

// Mock generateUniqueId to return a predictable value for assertions
vi.mock('./utils/generate-id', () => ({
	generateUniqueId: vi.fn().mockResolvedValue('log_test'),
}));

describe('auditLogRegistry', () => {
	const baseInput = {
		entityType: 'subject',
		entityId: 'sub_abc',
		actionType: 'update',
		eventTimezone: 'UTC',
	} as const;

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('createAuditLog', () => {
		it('should create an audit log and return it', async () => {
			const fakeDate = new Date('2024-01-01T00:00:00.000Z');
			vi.useFakeTimers();
			vi.setSystemTime(fakeDate);

			const db = {
				create: vi.fn().mockResolvedValue({
					id: 'log_test',
					createdAt: fakeDate,
					...baseInput,
				}),
			};

			const registry = auditLogRegistry({ db } as unknown as Registry);

			const result = (await registry.createAuditLog(baseInput)) as AuditLog;

			// Verify DB interaction
			expect(db.create).toHaveBeenCalledWith(
				'auditLog',
				expect.objectContaining({
					id: 'log_test',
					createdAt: fakeDate,
					...baseInput,
				})
			);

			// Verify returned value
			expect(result).toEqual(
				expect.objectContaining({ id: 'log_test', createdAt: fakeDate })
			);

			vi.useRealTimers();
		});

		it('should throw ORPCError when creation fails', async () => {
			const db = {
				create: vi.fn().mockResolvedValue(null),
			};

			const registry = auditLogRegistry({ db } as unknown as Registry);

			const promise = registry.createAuditLog(baseInput);
			await expect(promise).rejects.toBeInstanceOf(ORPCError);
			await expect(promise).rejects.toEqual(
				expect.objectContaining({
					code: 'INTERNAL_SERVER_ERROR',
					status: 500,
				})
			);
		});
	});
});
