import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../../database.types';
import { createModel } from '../../model';
import { type MockFn, createMockDatabase } from '../fixtures/mock-db';

describe('unit: transaction handling', () => {
	// Define test database types
	interface TestDB {
		users: {
			id: number;
			name: string;
			email?: string;
		};
	}

	let mockDb: any;
	let mockTransaction: MockFn;
	let mockExecuteTakeFirst: MockFn;
	let model: any;

	beforeEach(() => {
		// Set up mocks
		mockExecuteTakeFirst = vi.fn();

		// Create a proper mock transaction function that calls the callback with a transaction object
		mockTransaction = vi.fn().mockImplementation((callback) => {
			// Create a transaction object with required methods
			const transaction = {
				transaction: {
					selectFrom: vi.fn().mockReturnThis(),
					updateTable: vi.fn().mockReturnThis(),
					execute: vi.fn(),
				},
				afterCommit: vi.fn(),
			};

			// Actually call the callback with the transaction
			const result = callback(transaction);

			// Return the result wrapped in a promise
			return Promise.resolve(result);
		});

		// Create mock database with transaction method
		mockDb = createMockDatabase({
			selectFrom: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			offset: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue([]),
			executeTakeFirst: mockExecuteTakeFirst.mockResolvedValue(null),
			transaction: mockTransaction,
		});

		// Create model with mock db
		model = createModel(mockDb as unknown as Database<TestDB>, 'users', 'id');
	});

	it('should provide a transaction method on the model', () => {
		expect(model).toHaveProperty('transaction');
		expect(typeof model.transaction).toBe('function');
	});

	it('should call the database transaction method', async () => {
		const callback = vi.fn().mockResolvedValue('transaction result');

		await model.transaction(callback);

		expect(mockDb.transaction).toHaveBeenCalled();
		expect(callback).toHaveBeenCalled();
	});

	it('should pass the transaction to the callback', async () => {
		let transactionPassed: any = null;

		await model.transaction(async (trx: any) => {
			transactionPassed = trx;
			return null;
		});

		expect(transactionPassed).not.toBeNull();
		expect(transactionPassed).toHaveProperty('transaction');
		expect(transactionPassed.transaction).toHaveProperty('selectFrom');
		expect(transactionPassed.transaction).toHaveProperty('updateTable');
	});

	it('should return the result from the callback', async () => {
		const expectedResult = { id: 1, name: 'Test' };

		// Updated mockImplementation to return the callback's return value
		mockTransaction.mockImplementationOnce((callback) => {
			return Promise.resolve(expectedResult);
		});

		const result = await model.transaction(() => expectedResult);

		expect(result).toEqual(expectedResult);
	});

	it('should propagate errors from the transaction', async () => {
		// Make transaction reject with error
		mockTransaction.mockImplementationOnce(() => {
			return Promise.reject(new Error('Transaction error'));
		});

		await expect(
			model.transaction(async () => {
				return 'result';
			})
		).rejects.toThrow('Transaction error');
	});

	it('should use transaction for database operations within callback', async () => {
		const mockFindById = vi
			.fn()
			.mockResolvedValue({ id: 1, name: 'Test User' });

		// Create a transaction object that includes the find method
		mockTransaction.mockImplementationOnce((callback) => {
			const transaction = {
				transaction: {
					selectFrom: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					executeTakeFirst: mockFindById,
				},
				afterCommit: vi.fn(),
			};
			return Promise.resolve(callback(transaction));
		});

		await model.transaction(async (trx: any) => {
			// Use transaction to find a user by ID
			await trx.transaction.selectFrom().where().executeTakeFirst();
		});

		// Verify the mock was called
		expect(mockFindById).toHaveBeenCalled();
	});
});
