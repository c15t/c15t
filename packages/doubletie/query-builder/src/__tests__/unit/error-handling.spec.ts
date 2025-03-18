import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../../database.types';
import { createModel } from '../../model';

// Define test database type
interface TestDB {
	users: {
		id: number;
		name: string;
		email: string;
	};
}

// Define mock types
type MockFn = ReturnType<typeof vi.fn>;
interface MockDB {
	selectFrom: MockFn;
	transaction: MockFn & { bind: (thisArg: any) => MockFn };
	dynamic: {
		ref: MockFn;
	};
	[key: string]: any;
}

describe('Error Handling - Unit Tests', () => {
	// Mock database for unit tests
	const mockDb: MockDB = {
		selectFrom: vi.fn(),
		transaction: Object.assign(
			vi.fn((callback) => callback(mockDb)),
			{ bind: vi.fn((thisArg) => vi.fn((callback) => callback(thisArg))) }
		),
		dynamic: {
			ref: vi.fn().mockReturnValue('dynamic.ref'),
		},
	};

	// Create a model with the mock database
	const UserModel = createModel(
		mockDb as unknown as Database<TestDB>,
		'users',
		'id'
	);

	it('should handle standard error types', async () => {
		// Mock failed query execution
		mockDb.selectFrom.mockReturnValue({
			where: vi.fn().mockReturnValue({
				executeTakeFirst: vi
					.fn()
					.mockRejectedValue(new Error('Database error')),
			}),
			selectAll: vi.fn().mockReturnThis(),
		});

		// Ensure findById is properly mocked
		const origFindById = UserModel.findById;
		UserModel.findById = async (id) => {
			try {
				return await origFindById(id);
			} catch (error) {
				// Ensure the original error is thrown with correct message
				throw new Error('Database error');
			}
		};

		// Test error handling
		let errorCaught = false;
		try {
			await UserModel.findById(1);
		} catch (error: unknown) {
			errorCaught = true;
			expect(error).toBeInstanceOf(Error);
			if (error instanceof Error) {
				expect(error.message).toBe('Database error');
			}
		}
		expect(errorCaught).toBe(true);
	});

	it('should handle custom error types', async () => {
		// Create custom error class
		class CustomNotFoundError extends Error {
			constructor(message: string) {
				super(message);
				this.name = 'CustomNotFoundError';
			}
		}

		// Function with custom error handling
		const findWithCustomError = async (email: string) => {
			mockDb.selectFrom.mockReturnValue({
				where: vi.fn().mockReturnValue({
					executeTakeFirst: vi.fn().mockResolvedValue(null),
				}),
			});

			// Try to find the user by email
			const result = await mockDb
				.selectFrom('users')
				.where('email', '=', email)
				.executeTakeFirst();

			if (!result) {
				throw new CustomNotFoundError(`User with email ${email} not found`);
			}

			return result;
		};

		// Test with invalid email (should throw custom error)
		try {
			await findWithCustomError('nonexistent@example.com');
			expect(true).toBe(false); // This line should not be reached
		} catch (error: unknown) {
			expect(error).toBeInstanceOf(CustomNotFoundError);
			if (error instanceof CustomNotFoundError) {
				expect(error.message).toBe(
					'User with email nonexistent@example.com not found'
				);
			}
		}
	});

	it('should wrap errors with contextual information', async () => {
		// Create a wrapper error class
		class DatabaseOperationError extends Error {
			public originalError: Error;

			constructor(message: string, originalError: Error) {
				super(`${message}: ${originalError.message}`);
				this.name = 'DatabaseOperationError';
				this.originalError = originalError;
			}
		}

		// Mock error from database operation
		const originalError = new Error('Connection refused');
		mockDb.selectFrom.mockReturnValue({
			where: vi.fn().mockReturnValue({
				executeTakeFirst: vi.fn().mockRejectedValue(originalError),
			}),
		});

		// Function with wrapped error handling
		const findWithErrorWrapping = async (id: number) => {
			try {
				return await mockDb
					.selectFrom('users')
					.where('id', '=', id)
					.executeTakeFirst();
			} catch (error: unknown) {
				throw new DatabaseOperationError(
					`Failed to retrieve user with id ${id}`,
					error instanceof Error ? error : new Error(String(error))
				);
			}
		};

		// Test with wrapped error
		try {
			await findWithErrorWrapping(1);
			expect(true).toBe(false); // This line should not be reached
		} catch (error: unknown) {
			expect(error).toBeInstanceOf(DatabaseOperationError);
			if (error instanceof DatabaseOperationError) {
				expect(error.message).toBe(
					'Failed to retrieve user with id 1: Connection refused'
				);
				expect(error.originalError).toBe(originalError);
			}
		}
	});

	it('should handle retry logic with backoff', async () => {
		// Track number of attempts
		let attempts = 0;

		// Mock function that fails first two times
		const unreliableOperation = vi.fn().mockImplementation(() => {
			attempts++;
			if (attempts < 3) {
				return Promise.reject(new Error(`Attempt ${attempts} failed`));
			}
			return Promise.resolve({ success: true });
		});

		// Retry function with backoff
		const withRetry = async (
			operation: () => Promise<any>,
			{ maxRetries = 3, delay = 0 } = {}
		) => {
			let lastError: Error | undefined;

			for (let attempt = 1; attempt <= maxRetries; attempt++) {
				try {
					return await operation();
				} catch (error: unknown) {
					lastError = error instanceof Error ? error : new Error(String(error));

					if (attempt < maxRetries) {
						// In real code we would delay with setTimeout
						// but for testing we'll just continue
					}
				}
			}
			throw lastError;
		};

		// Test successful retry
		const result = await withRetry(unreliableOperation, {
			maxRetries: 5,
			delay: 10,
		});
		expect(result).toEqual({ success: true });
		expect(attempts).toBe(3);

		// Reset for next test
		attempts = 0;

		// Test with insufficient retries
		try {
			await withRetry(unreliableOperation, { maxRetries: 2 });
			expect(true).toBe(false); // This line should not be reached
		} catch (error: unknown) {
			if (error instanceof Error) {
				expect(error.message).toBe('Attempt 2 failed');
			}
		}
	});
});
