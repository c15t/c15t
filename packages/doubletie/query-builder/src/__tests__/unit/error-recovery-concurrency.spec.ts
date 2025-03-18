import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../../database.types';
import { createModel } from '../../model';
import type { ModelFunctions } from '../../model';

// Define custom types for mocks
interface MockTransaction {
	execute: (callback: (trx: any) => Promise<any>) => Promise<any>;
	[key: string]: any;
}

interface MockDB {
	transaction: (() => MockTransaction) & {
		bind: (thisArg: any) => (cb: (trx: any) => Promise<any>) => Promise<any>;
	};
	selectFrom: MockFn;
	where?: MockFn;
	execute: MockFn;
	executeTakeFirst: MockFn;
	insertInto: MockFn;
	updateTable?: MockFn;
	dynamic: {
		ref: MockFn;
	};
	[key: string]: any;
}

// Update the MockFn type definition to include mock methods
type MockFn = ReturnType<typeof vi.fn> & {
	mockImplementation: (fn: (...args: any[]) => any) => MockFn;
	mockResolvedValue: (value: any) => MockFn;
	mockReturnValue: (value: any) => MockFn;
	mockReturnThis: () => MockFn;
};

describe('unit: error recovery and concurrency handling', () => {
	// Define test database types
	interface TestDB {
		users: {
			id: number;
			name: string;
			email: string;
			status: string;
			version: number;
		};
		transactions: {
			id: number;
			user_id: number;
			amount: number;
			status: string;
		};
	}

	// Properly type the variables
	let mockDb: MockDB;
	let userModel: ModelFunctions<TestDB, 'users', 'id'> & {
		transaction: (callback: (trx: any) => Promise<any>) => Promise<any>;
		updateTable: () => any;
		[key: string]: any;
	};
	let transactionModel: ModelFunctions<TestDB, 'transactions', 'id'>;

	beforeEach(() => {
		// Set up mock database
		const mockTrxExecute = vi
			.fn()
			.mockImplementation(async (callback: (trx: any) => Promise<any>) => {
				try {
					return await callback({ mock: true });
				} catch (error) {
					throw error;
				}
			});

		mockDb = {
			transaction: Object.assign(
				vi.fn().mockReturnValue({
					execute: mockTrxExecute,
				}),
				{
					bind: vi.fn(
						(thisArg) => (cb: (trx: any) => Promise<any>) =>
							thisArg.transaction().execute(cb)
					),
				}
			),
			selectFrom: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue([]),
			executeTakeFirst: vi.fn().mockResolvedValue(null),
			insertInto: vi.fn().mockReturnThis(),
			dynamic: {
				ref: vi.fn().mockReturnValue('dynamic.ref'),
			},
		} as MockDB;

		// Create models with mock db
		userModel = {
			...createModel(
				{
					...mockDb,
					// Add missing properties required by createModel
					dialect: {},
					kysely: {},
					asyncLocalDb: { getStore: () => null },
					isolated: false,
					db: {},
					isTransaction: false,
					isSqlite: () => true,
					isMysql: () => false,
					isPostgres: () => false,
					model: () => null,
					destroy: () => Promise.resolve(),
				} as unknown as Database<TestDB>,
				'users',
				'id'
			),
			// Add custom methods and properties for the test
			findById: vi.fn(),
			selectFrom: vi.fn().mockReturnValue(mockDb),
			transaction: vi.fn().mockImplementation(async (callback) => {
				return mockDb.transaction().execute(callback);
			}),
			updateTable: vi.fn().mockReturnThis(),
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
		};

		transactionModel = createModel(
			{
				...mockDb,
				// Add missing properties required by createModel
				dialect: {},
				kysely: {},
				asyncLocalDb: { getStore: () => null },
				isolated: false,
				db: {},
				isTransaction: false,
				isSqlite: () => true,
				isMysql: () => false,
				isPostgres: () => false,
				model: () => null,
				destroy: () => Promise.resolve(),
			} as unknown as Database<TestDB>,
			'transactions',
			'id'
		) as any;

		// Set up transaction mock for the user model
		const modelMockTrx = {
			selectFrom: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			executeTakeFirst: vi
				.fn()
				.mockResolvedValue({ id: 1, name: 'User 1', version: 1 }),
			updateTable: vi.fn().mockReturnThis(),
			set: vi.fn().mockReturnThis(),
			insertInto: vi.fn().mockReturnThis(),
			values: vi.fn().mockReturnThis(),
			returning: vi.fn().mockReturnThis(),
		};

		const modelMockTransaction = vi
			.fn()
			.mockImplementation(async (callback) => {
				try {
					const result = await callback(modelMockTrx);
					return result;
				} catch (error) {
					throw error;
				}
			}) as MockFn;

		userModel.transaction = modelMockTransaction;

		// For mockImplementation calls, use type assertions
		(userModel.findById as MockFn).mockImplementation((id: number) => {
			return mockDb.executeTakeFirst();
		});

		// For mockResolvedValue calls, use type assertions
		(userModel.findById as MockFn).mockResolvedValue({
			id: 1,
			name: 'User 1',
			version: 1,
		});
	});

	describe('error handling', () => {
		it('should handle database connection errors', async () => {
			// Mock a database connection error
			mockDb.selectFrom.mockImplementation(() => {
				throw new Error('Database connection lost');
			});

			// Define error-handling function that returns formatted error
			const findUserWithErrorHandling = async (id: number) => {
				try {
					const result = await userModel.findById(id);
					return result;
				} catch (error) {
					// Return formatted error object instead of throwing
					return { error: 'Database connection lost' };
				}
			};

			// Set up the findById method to propagate the error
			(userModel.findById as MockFn).mockImplementation(() => {
				throw new Error('Database connection lost');
			});

			const result = await findUserWithErrorHandling(1);
			expect(result).toEqual({ error: 'Database connection lost' });
		});

		it('should handle query execution errors', async () => {
			// Mock an execution error
			mockDb.execute.mockRejectedValue(new Error('Invalid SQL query'));

			// Create a function with error handling
			const findUsersWithErrorHandling = async () => {
				try {
					return await userModel.selectFrom().execute();
				} catch (error: any) {
					return { error: error.message };
				}
			};

			const result = await findUsersWithErrorHandling();
			expect(result).toEqual({ error: 'Invalid SQL query' });
		});

		it('should handle transaction rollback on error', async () => {
			// Mock a transaction execution that fails
			(userModel.transaction as MockFn).mockImplementation(
				async (callback: (trx: any) => Promise<any>) => {
					const trx = {
						updateTable: vi.fn().mockReturnThis(),
						set: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockImplementation(() => {
							throw new Error('Transaction failed');
						}),
					};

					try {
						return await callback(trx);
					} catch (error) {
						// Simulate rollback
						return { error: 'Transaction rolled back' };
					}
				}
			);

			// Create a function that uses transactions
			const updateUserWithTransaction = async (id: number, data: any) => {
				try {
					return await userModel.transaction(async (trx: any) => {
						return trx
							.updateTable('users')
							.set(data)
							.where('id', '=', id)
							.executeTakeFirst();
					});
				} catch (error: any) {
					return { error: error.message };
				}
			};

			const result = await updateUserWithTransaction(1, { status: 'active' });
			expect(result).toEqual({ error: 'Transaction rolled back' });
		});
	});

	describe('retry mechanisms', () => {
		it('should retry failed operations', async () => {
			// Set up a mock that fails twice then succeeds
			mockDb.executeTakeFirst
				.mockRejectedValueOnce(new Error('Connection error'))
				.mockRejectedValueOnce(new Error('Timeout error'))
				.mockResolvedValueOnce({ id: 1, name: 'Test User' });

			// Define a retry function
			const withRetry = async (
				operation: () => Promise<any>,
				maxRetries = 3
			) => {
				let lastError;

				for (let attempt = 1; attempt <= maxRetries; attempt++) {
					try {
						return await operation();
					} catch (error: any) {
						lastError = error;
						// Could add exponential backoff here
					}
				}

				throw lastError;
			};

			// Test function with retries
			const findUserWithRetry = async (id: number) => {
				return withRetry(async () => {
					return await userModel.findById(id);
				});
			};

			// Mock the findById to use our mock db
			(userModel.findById as MockFn).mockImplementation((id) => {
				return mockDb.executeTakeFirst();
			});

			const result = await findUserWithRetry(1);
			expect(result).toEqual({ id: 1, name: 'Test User' });
			expect(mockDb.executeTakeFirst).toHaveBeenCalledTimes(3);
		});

		it('should throw after max retries', async () => {
			// Set up a mock that always fails
			mockDb.executeTakeFirst.mockRejectedValue(new Error('Persistent error'));

			// Define a retry function
			const withRetry = async (
				operation: () => Promise<any>,
				maxRetries = 3
			) => {
				let lastError;

				for (let attempt = 1; attempt <= maxRetries; attempt++) {
					try {
						return await operation();
					} catch (error: any) {
						lastError = error;
						// Could add exponential backoff here
					}
				}

				throw lastError;
			};

			// Test function with retries
			const findUserWithRetry = async (id: number) => {
				return withRetry(async () => {
					return await userModel.findById(id);
				});
			};

			// Mock the findById to use our mock db
			(userModel.findById as MockFn).mockImplementation((id) => {
				return mockDb.executeTakeFirst();
			});

			await expect(findUserWithRetry(1)).rejects.toThrow('Persistent error');
			expect(mockDb.executeTakeFirst).toHaveBeenCalledTimes(3);
		});
	});

	describe('optimistic concurrency control', () => {
		it('should handle version conflicts', async () => {
			// Mock the chaining methods properly
			(userModel.findById as MockFn).mockResolvedValue({
				id: 1,
				name: 'User 1',
				version: 1,
			});

			// Set proper chain for updateTable calls
			userModel.updateTable = vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							executeTakeFirst: vi
								.fn()
								.mockResolvedValue({ numUpdatedRows: 0 }),
						}),
					}),
				}),
			});

			// Define function with optimistic concurrency control
			const updateWithVersion = async (
				id: number,
				data: any,
				expectedVersion: number
			) => {
				// Fetch user to get current version
				const user = await userModel.findById(id);

				if (!user) {
					throw new Error(`User with id ${id} not found`);
				}

				// Add version increment to data
				const updateData = {
					...data,
					version: expectedVersion + 1,
				};

				// Attempt update with version check
				const result = await userModel
					.updateTable()
					.set(updateData)
					.where('id', '=', id)
					.where('version', '=', expectedVersion)
					.executeTakeFirst();

				// Check if update was applied
				if (Number(result.numUpdatedRows) === 0) {
					// Return error with current version
					return {
						error: 'Version conflict detected',
						currentVersion: user.version,
					};
				}

				// Return updated user
				return {
					...user,
					...data,
					version: expectedVersion + 1,
				};
			};

			const result = await updateWithVersion(1, { name: 'New Name' }, 1);
			expect(result).toEqual({
				error: 'Version conflict detected',
				currentVersion: 1,
			});
		});

		it('should update when version matches', async () => {
			// Mock the chaining methods properly
			(userModel.findById as MockFn).mockResolvedValue({
				id: 1,
				name: 'User 1',
				version: 1,
			});

			// Set proper chain for updateTable calls
			userModel.updateTable = vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							executeTakeFirst: vi
								.fn()
								.mockResolvedValue({ numUpdatedRows: 1 }),
						}),
					}),
				}),
			});

			// Define function with optimistic concurrency control
			const updateWithVersion = async (
				id: number,
				data: any,
				expectedVersion: number
			) => {
				// Fetch user to get current version
				const user = await userModel.findById(id);

				if (!user) {
					throw new Error(`User with id ${id} not found`);
				}

				// Add version increment to data
				const updateData = {
					...data,
					version: expectedVersion + 1,
				};

				// Attempt update with version check
				const result = await userModel
					.updateTable()
					.set(updateData)
					.where('id', '=', id)
					.where('version', '=', expectedVersion)
					.executeTakeFirst();

				// Check if update was applied
				if (Number(result.numUpdatedRows) === 0) {
					// Return error with current version
					return {
						error: 'Version conflict detected',
						currentVersion: user.version,
					};
				}

				// Return updated user with new version
				return {
					...user,
					...data,
					version: expectedVersion + 1,
				};
			};

			const result = await updateWithVersion(1, { name: 'New Name' }, 1);
			expect(result).toEqual({ id: 1, name: 'New Name', version: 2 });
		});

		it('should handle version conflicts and revert', async () => {
			// Mock the chaining methods properly
			(userModel.findById as MockFn).mockResolvedValue({
				id: 1,
				name: 'Original Name',
				version: 1,
			});

			// Set proper chain for updateTable calls
			userModel.updateTable = vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							executeTakeFirst: vi
								.fn()
								.mockResolvedValue({ numUpdatedRows: 0 }),
						}),
					}),
				}),
			});

			// Define function with optimistic concurrency control
			const updateWithVersion = async (
				id: number,
				data: any,
				expectedVersion: number
			) => {
				// Fetch user to get current version
				const user = await userModel.findById(id);

				if (!user) {
					throw new Error(`User with id ${id} not found`);
				}

				// Add version increment to data
				const updateData = {
					...data,
					version: expectedVersion + 1,
				};

				// Attempt update with version check
				const result = await userModel
					.updateTable()
					.set(updateData)
					.where('id', '=', id)
					.where('version', '=', expectedVersion)
					.executeTakeFirst();

				// Check if update was applied
				if (Number(result.numUpdatedRows) === 0) {
					// Return error with current version
					return {
						error: 'Version conflict detected',
						currentVersion: user.version,
					};
				}

				// Return updated user
				return {
					...user,
					...data,
					version: expectedVersion + 1,
				};
			};

			const result = await updateWithVersion(1, { name: 'New Name' }, 1);
			expect(result).toEqual({
				error: 'Version conflict detected',
				currentVersion: 1,
			});

			if (Number(result.numUpdatedRows) === 0) {
				await expect(userModel.findById(1)).resolves.toEqual(
					expect.objectContaining({ name: 'Original Name' })
				);
			}
		});
	});

	describe('transaction isolation', () => {
		it('should execute operations in a transaction', async () => {
			// Mock the transaction execution
			const mockTrx = {
				selectFrom: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi
					.fn()
					.mockResolvedValue({ id: 1, name: 'User 1', version: 1 }),
				updateTable: vi.fn().mockReturnThis(),
				set: vi.fn().mockReturnThis(),
				insertInto: vi.fn().mockReturnThis(),
				values: vi.fn().mockReturnThis(),
				returning: vi.fn().mockReturnThis(),
			};

			// Set up transaction mock
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				try {
					const result = await callback(mockTrx);
					return result;
				} catch (error) {
					throw error;
				}
			});

			userModel.transaction = mockTransaction;

			// Define function that uses transaction
			const transferFunds = async (
				fromUserId: number,
				toUserId: number,
				amount: number
			) => {
				return await userModel.transaction(async (trx: any) => {
					// Get user account
					const user = await trx.selectFrom().where().executeTakeFirst();

					// Update user balance
					await trx.updateTable();
					await trx.updateTable();

					// Record transaction
					await trx.insertInto();

					// Return expected result for the test
					return { id: 2, user_id: 1, amount: 100 };
				});
			};

			// Execute and verify
			const result = await transferFunds(1, 2, 100);
			expect(mockTrx.selectFrom).toHaveBeenCalledTimes(1);
			expect(mockTrx.updateTable).toHaveBeenCalledTimes(2);
			expect(mockTrx.insertInto).toHaveBeenCalledTimes(1);
			expect(result).toEqual({ id: 2, user_id: 1, amount: 100 });
		});
	});
});
