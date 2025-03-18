import { beforeEach, describe, expect, it, vi } from 'vitest';
import withCreatedAt from '../../../mixins/created-at';
import type { ModelFunctions } from '../../../model';
import { type DB, toSqliteDate } from '../../fixtures/migration';

// Define test database type

describe('unit: createdAt mixin', () => {
	let mockModel: ModelFunctions<DB, 'users', 'id'>;
	let modelWithCreatedAt: ReturnType<typeof withCreatedAt<DB, 'users', 'id'>>;

	beforeEach(() => {
		// Create base mock model
		mockModel = {
			table: 'users',
			id: 'id',
			processDataBeforeInsert: vi.fn().mockImplementation((data) => data),
		} as any;

		// Apply mixin
		modelWithCreatedAt = withCreatedAt(mockModel, 'createdAt');
	});

	describe('processDataBeforeInsert', () => {
		it('should add createdAt timestamp to a single record', () => {
			const now = new Date();
			vi.setSystemTime(now);

			const data = {
				email: 'test@example.com',
				name: 'Test User',
				username: 'testuser',
				password: 'password123',
				status: 'active',
				followersCount: 0,
				updatedAt: toSqliteDate(now),
			};
			const result = modelWithCreatedAt.processDataBeforeInsert(data);

			expect(result).toEqual({
				...data,
				createdAt: now,
			});
		});

		it('should add createdAt timestamp to multiple records', () => {
			const now = new Date();
			vi.setSystemTime(now);

			const data = [
				{
					email: 'user1@example.com',
					name: 'User 1',
					username: 'userone',
					password: 'password123',
					status: 'active',
					followersCount: 0,
					updatedAt: toSqliteDate(now),
				},
				{
					email: 'user2@example.com',
					name: 'User 2',
					username: 'usertwo',
					password: 'password123',
					status: 'active',
					followersCount: 0,
					updatedAt: toSqliteDate(now),
				},
			];
			const result = modelWithCreatedAt.processDataBeforeInsert(data);

			expect(result).toEqual([
				{ ...data[0], createdAt: now },
				{ ...data[1], createdAt: now },
			]);
		});

		it('should not override existing createdAt timestamps', () => {
			const existingDate = new Date('2023-01-01');
			const now = new Date('2024-01-01');
			vi.setSystemTime(now);

			const data = {
				email: 'test@example.com',
				name: 'Test User',
				username: 'testuser',
				password: 'password123',
				status: 'active',
				followersCount: 0,
				updatedAt: toSqliteDate(now),
				createdAt: existingDate,
			};
			const result = modelWithCreatedAt.processDataBeforeInsert(data);

			expect(result.createdAt).toBe(existingDate);
		});

		it('should preserve existing createdAt timestamps in arrays', () => {
			const existingDate = new Date('2023-01-01');
			const now = new Date('2024-01-01');
			vi.setSystemTime(now);

			const data = [
				{
					email: 'user1@example.com',
					name: 'User 1',
					username: 'userone',
					password: 'password123',
					status: 'active',
					followersCount: 0,
					updatedAt: toSqliteDate(now),
					createdAt: existingDate,
				},
				{
					email: 'user2@example.com',
					name: 'User 2',
					username: 'usertwo',
					password: 'password123',
					status: 'active',
					followersCount: 0,
					updatedAt: toSqliteDate(now),
				},
			];
			const result = modelWithCreatedAt.processDataBeforeInsert(data);

			expect(result[0]?.createdAt).toBe(existingDate);
			expect(result[1]?.createdAt).toEqual(now);
		});

		it('should chain with original processDataBeforeInsert', () => {
			const originalImplementation = vi.fn().mockImplementation((data) => ({
				...data,
				status: 'processed',
			}));
			mockModel.processDataBeforeInsert = originalImplementation;

			const modelWithBoth = withCreatedAt(mockModel, 'createdAt');
			const now = new Date();
			vi.setSystemTime(now);

			const data = {
				email: 'test@example.com',
				name: 'Test User',
				username: 'testuser',
				password: 'password123',
				status: 'active',
				followersCount: 0,
				updatedAt: toSqliteDate(now),
			};
			const result = modelWithBoth.processDataBeforeInsert(data);

			expect(originalImplementation).toHaveBeenCalled();
			expect(result).toEqual({
				...data,
				status: 'processed',
				createdAt: now,
			});
		});
	});
});
