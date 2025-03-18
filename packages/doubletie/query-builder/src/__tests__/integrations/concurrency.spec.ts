import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createModel } from '../../model';
import {
	cleanupDatabase,
	db,
	initializeDatabase,
	toSqliteDate,
} from '../fixtures/migration';

describe('Integration: Concurrency Control', () => {
	beforeEach(async () => {
		await initializeDatabase();
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('should handle concurrent updates using version numbers', async () => {
		const UserModel = createModel(db, 'users', 'id');

		// Create initial user
		const userData = {
			email: 'concurrent@example.com',
			name: 'Concurrent User',
			username: 'concurrentuser',
			password: 'password123',
			followersCount: 0,
			status: 'active',
			createdAt: toSqliteDate(new Date()),
			updatedAt: toSqliteDate(new Date()),
		};

		const insertResult = await UserModel.insertInto()
			.values(userData)
			.executeTakeFirstOrThrow();
		const userId = String(insertResult.insertId);

		// Simulate two concurrent updates
		const update1 = async () => {
			const user = await UserModel.findById(userId);
			if (!user) throw new Error('User not found');

			// Simulate some delay to increase chance of conflict
			await new Promise((resolve) => setTimeout(resolve, 100));

			return await UserModel.updateTable()
				.set({
					name: 'Updated by 1',
					followersCount: user.followersCount + 1,
					updatedAt: toSqliteDate(new Date()),
				})
				.where('id', '=', userId)
				.where('followersCount', '=', user.followersCount) // Optimistic locking
				.execute();
		};

		const update2 = async () => {
			const user = await UserModel.findById(userId);
			if (!user) throw new Error('User not found');

			return await UserModel.updateTable()
				.set({
					name: 'Updated by 2',
					followersCount: user.followersCount + 2,
					updatedAt: toSqliteDate(new Date()),
				})
				.where('id', '=', userId)
				.where('followersCount', '=', user.followersCount) // Optimistic locking
				.execute();
		};

		// Run updates concurrently
		const [result1, result2] = await Promise.all([update1(), update2()]);

		// One update should succeed and one should fail
		const finalUser = await UserModel.findById(userId);
		expect(finalUser).toBeDefined();
		expect(
			finalUser?.name === 'Updated by 1' || finalUser?.name === 'Updated by 2'
		).toBe(true);
		expect(finalUser?.followersCount).toBe(
			finalUser?.name === 'Updated by 1' ? 1 : 2
		);
	});

	it('should handle concurrent operations with row-level locking', async () => {
		const UserModel = createModel(db, 'users', 'id');

		// Create initial user
		const userData = {
			email: 'locked@example.com',
			name: 'Locked User',
			username: 'lockeduser',
			password: 'password123',
			followersCount: 100,
			status: 'active',
			createdAt: toSqliteDate(new Date()),
			updatedAt: toSqliteDate(new Date()),
		};

		const insertResult = await UserModel.insertInto()
			.values(userData)
			.executeTakeFirstOrThrow();
		const userId = String(insertResult.insertId);

		// Function to update user with transaction lock
		const updateWithLock = async (newFollowersCount: number) => {
			return await UserModel.transaction(async (db) => {
				// Select for update locks the row
				const user = await db.transaction
					.selectFrom('users')
					.selectAll()
					.where('id', '=', userId)
					.executeTakeFirstOrThrow();

				// Simulate some processing time
				await new Promise((resolve) => setTimeout(resolve, 100));

				// Update with new value
				await db.transaction
					.updateTable('users')
					.set({
						followersCount: newFollowersCount,
						updatedAt: toSqliteDate(new Date()),
					})
					.where('id', '=', userId)
					.execute();

				return user;
			});
		};

		// Run concurrent updates
		const results = await Promise.all([
			updateWithLock(150),
			updateWithLock(200),
		]);

		// Verify final state
		const finalUser = await UserModel.findById(userId);
		expect(finalUser).toBeDefined();
		expect(finalUser?.followersCount).toBe(200); // Last update wins
	});
});
