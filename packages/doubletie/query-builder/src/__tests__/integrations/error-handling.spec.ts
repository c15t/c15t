import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createModel } from '../../model';
import type { Timestamp, Users } from '../fixtures/migration';
import {
	cleanupDatabase,
	db,
	initializeDatabase,
	toSqliteDate,
} from '../fixtures/migration';

describe('Integration: Error Handling', () => {
	beforeEach(async () => {
		await initializeDatabase();
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('handles record not found errors', async () => {
		const UserModel = createModel(db, 'users', 'id');

		const user = await UserModel.findById('nonexistent-id');

		expect(user).toBeUndefined();
	});

	it('handles custom error types', async () => {
		const UserModel = createModel(db, 'users', 'id');

		// Create custom error class
		class CustomNotFoundError extends Error {
			constructor(message: string) {
				super(message);
				this.name = 'CustomNotFoundError';
			}
		}

		// Function that throws custom error
		const findWithCustomError = async (email: string) => {
			const result = await db
				.selectFrom('users')
				.where('email', '=', email)
				.selectAll()
				.executeTakeFirst();

			if (!result) {
				throw new CustomNotFoundError(`User with email ${email} not found`);
			}

			return result;
		};

		// Create test user
		const userData = {
			email: 'custom@example.com',
			name: 'Custom Error User',
			username: 'customerror',
			password: 'password123',
			followersCount: 0,
			status: 'active',
			createdAt: toSqliteDate(new Date()),
			updatedAt: toSqliteDate(new Date()),
		};

		await UserModel.insertInto().values(userData).executeTakeFirstOrThrow();

		// Test with valid email
		const user = await findWithCustomError('custom@example.com');
		expect(user).toBeDefined();
		expect(user.email).toBe('custom@example.com');

		// Test with invalid email
		try {
			await findWithCustomError('nonexistent@example.com');
			expect.fail('Should have thrown an error');
		} catch (error) {
			if (!(error instanceof CustomNotFoundError)) {
				throw error;
			}
			expect(error.message).toBe(
				'User with email nonexistent@example.com not found'
			);
		}
	});

	it('handles unique constraint violations', async () => {
		const UserModel = createModel(db, 'users', 'id');

		// Create initial user
		const userData = {
			email: 'unique@example.com',
			name: 'Unique User',
			username: 'uniqueuser',
			password: 'password123',
			followersCount: 0,
			status: 'active',
			createdAt: toSqliteDate(new Date()),
			updatedAt: toSqliteDate(new Date()),
		};

		await UserModel.insertInto().values(userData).executeTakeFirstOrThrow();

		// Try to create duplicate user
		try {
			await UserModel.insertInto().values(userData).executeTakeFirstOrThrow();
			expect.fail('Should have thrown a unique constraint error');
		} catch (error: any) {
			expect(error.toString()).toContain('UNIQUE constraint failed');
		}
	});

	it('handles foreign key constraint violations', async () => {
		const CommentModel = createModel(db, 'comments', 'id');

		// Try to insert a comment with a non-existent user
		try {
			await CommentModel.insertInto()
				.values({
					userId: '999999', // Non-existent user ID
					message: 'This comment should fail',
					createdAt: toSqliteDate(new Date()),
					updatedAt: toSqliteDate(new Date()),
				})
				.executeTakeFirstOrThrow();
			expect.fail('Should have thrown a foreign key constraint error');
		} catch (error: any) {
			expect(error.toString()).toContain('FOREIGN KEY constraint failed');
		}
	});

	it('handles transaction rollbacks', async () => {
		const UserModel = createModel(db, 'users', 'id');

		const createUserWithTransaction = async (userData: Partial<Users>) => {
			const result = await UserModel.transaction(async (db) => {
				// First insert
				const firstInsertData = {
					email: userData.email as string,
					name: userData.name as string,
					username: userData.username as string,
					password: userData.password as string,
					status: userData.status as string,
					followersCount: userData.followersCount as number,
					createdAt: toSqliteDate(new Date()),
					updatedAt: toSqliteDate(new Date()),
				};

				await db.transaction
					.insertInto('users')
					.values(firstInsertData)
					.executeTakeFirst();

				// Second insert with same email to trigger unique constraint
				const secondInsertData = {
					email: userData.email as string, // Same email to trigger unique constraint
					name: 'Another User',
					username: 'anotheruser',
					password: 'password456',
					status: 'active',
					followersCount: 0,
					createdAt: toSqliteDate(new Date()),
					updatedAt: toSqliteDate(new Date()),
				};

				// This should fail with unique constraint error
				await db.transaction
					.insertInto('users')
					.values(secondInsertData)
					.executeTakeFirst();
			});

			return result;
		};

		const userData = {
			email: 'transaction@example.com',
			name: 'Transaction User',
			username: 'transactionuser',
			password: 'password123',
			followersCount: 0,
			status: 'active',
			createdAt: toSqliteDate(new Date()) as unknown as Timestamp,
			updatedAt: new Date().toISOString() as unknown as Timestamp,
		};

		try {
			await createUserWithTransaction(userData);
			expect.fail('Should have thrown an error');
		} catch (error: any) {
			expect(error.toString()).toContain('UNIQUE constraint failed');
		}

		// Verify transaction was rolled back
		const user = await UserModel.findOne('email', userData.email);

		expect(user).toBeUndefined();
	});

	it('supports error recovery with retry logic', async () => {
		const UserModel = createModel(db, 'users', 'id');

		// Create initial user for testing
		const userData = {
			email: 'retry@example.com',
			name: 'Retry User',
			username: 'retryuser',
			password: 'password123',
			followersCount: 0,
			status: 'active',
			createdAt: toSqliteDate(new Date()),
			updatedAt: toSqliteDate(new Date()),
		};

		await UserModel.insertInto().values(userData).executeTakeFirstOrThrow();

		// Function that fails initially but succeeds after retries
		const updateWithRetry = async (maxRetries = 3) => {
			let attempts = 0;
			let lastError: Error | null = null;

			while (attempts < maxRetries) {
				try {
					attempts++;

					// Simulate failure for first attempt
					if (attempts === 1) {
						throw new Error('Simulated first attempt failure');
					}

					// Update succeeds on subsequent attempts
					await UserModel.updateTable()
						.set({ status: 'updated' })
						.where('email', '=', userData.email)
						.execute();

					return { success: true, attempts };
				} catch (error) {
					if (error instanceof Error) {
						lastError = error;
					}
				}
			}

			throw lastError || new Error('Max retries exceeded');
		};

		const result = await updateWithRetry();
		expect(result.success).toBe(true);
		expect(result.attempts).toBe(2); // Should succeed on second attempt

		// Verify the update was successful
		const updatedUser = await UserModel.findOne('email', userData.email);

		expect(updatedUser?.status).toBe('updated');
	});
});
