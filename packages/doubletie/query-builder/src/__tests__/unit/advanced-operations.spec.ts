import { sql } from 'kysely';
import { describe, expect, it, vi } from 'vitest';
import {
	type MockExpressionBuilder,
	createMockDatabase,
	createMockExpressionBuilder,
} from '../fixtures/mock-db';

// Define test database types
interface TestDB {
	users: {
		id: number;
		name: string;
		email: string;
		status?: string;
	};
	products: {
		id: string;
		name: string;
	};
	json_test: {
		id: string;
		data: string;
	};
}

// Type for mock chain
interface MockChain {
	[key: string]: any;
	selectAll: () => MockChain;
	where: (callbackOrColumn: any, operator?: string, value?: any) => MockChain;
	execute: () => Promise<any[]>;
}

describe('Advanced Model Operations - Unit Tests', () => {
	it('should support creating custom query builders', async () => {
		// Define a status extension type
		// Return type for batch update
		interface BatchUpdateResult {
			numUpdatedRows: bigint;
		}

		// Create mock update builder
		const mockUpdateBuilder = {
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			whereIn: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue({ numUpdatedRows: BigInt(5) }),
		};

		// Create mock database with required methods
		const mockDb = createMockDatabase<TestDB>({
			updateTable: vi.fn().mockReturnValue(mockUpdateBuilder),
		});

		// Create a batch update function using a custom query builder
		const batchUpdateStatus = async (
			userIds: number[],
			status: string
		): Promise<BatchUpdateResult> => {
			return (await mockDb
				.updateTable('users')
				.set({ status })
				.whereIn('id', userIds)
				.execute()) as BatchUpdateResult;
		};

		// Test the batch update function
		const result = await batchUpdateStatus([1, 2, 3, 4, 5], 'inactive');

		// Verify the update was called with correct params
		expect(mockDb.updateTable).toHaveBeenCalledWith('users');
		expect(mockUpdateBuilder.set).toHaveBeenCalledWith({
			status: 'inactive',
		});
		expect(mockUpdateBuilder.whereIn).toHaveBeenCalledWith(
			'id',
			[1, 2, 3, 4, 5]
		);

		// Verify the result contains expected properties
		expect(result).toHaveProperty('numUpdatedRows');
		expect(result.numUpdatedRows).toBe(BigInt(5));
	});

	it('should handle batch operations efficiently', async () => {
		// Create test data
		const testUsers = [
			{ id: 1, name: 'User 1', email: 'user1@test.com' },
			{ id: 2, name: 'User 2', email: 'user2@test.com' },
			{ id: 3, name: 'User 3', email: 'user3@test.com' },
		];

		// Create mock query chain
		const mockQueryChain = {
			where: vi.fn().mockReturnThis(),
			whereIn: vi.fn().mockReturnThis(),
			selectAll: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue(testUsers),
		};

		// Create mock database with required methods
		const mockDb = createMockDatabase<TestDB>({
			selectFrom: vi.fn().mockReturnValue(mockQueryChain),
		});

		// Create a function to get multiple users by IDs
		const getUsersByIds = async (ids: number[]) => {
			return mockDb
				.selectFrom('users')
				.whereIn('id', ids)
				.selectAll()
				.execute();
		};

		// Test the batch operation
		const users = await getUsersByIds([1, 2, 3]);

		// Verify the result
		expect(Array.isArray(users)).toBe(true);
		expect(users.length).toBe(3);
		expect(users[0].id).toBe(1);
		expect(users[1].id).toBe(2);
		expect(users[2].id).toBe(3);

		// Check that the whereIn was called with the correct IDs
		expect(mockQueryChain.whereIn).toHaveBeenCalledWith('id', [1, 2, 3]);
	});

	it('should support tuple operations with expression builder', async () => {
		// Create test data
		const testProducts = [
			{ id: 'product1', name: 'Product A' },
			{ id: 'product2', name: 'Product B' },
		];

		// Create mock query chain with properly typed methods
		const mockQueryChain: MockChain = {
			selectAll: vi.fn().mockReturnThis(),
			where: vi.fn().mockImplementation(function (
				this: MockChain,
				callbackOrColumn: any,
				operator?: string,
				value?: any
			) {
				// If this is a column-based call
				if (
					typeof callbackOrColumn === 'string' &&
					operator &&
					value !== undefined
				) {
					return this;
				}

				// Otherwise, it's a callback with expression builder
				if (typeof callbackOrColumn === 'function') {
					// Create a mock expression builder
					const eb = createMockExpressionBuilder();

					// Call the callback with our mocked expression builder
					callbackOrColumn(eb);
					return this;
				}

				return this;
			}),
			execute: vi.fn().mockResolvedValue(testProducts),
		};

		// Create mock database with required methods
		const mockDb = createMockDatabase<TestDB>({
			selectFrom: vi.fn().mockReturnValue(mockQueryChain),
		});

		// Create a tuple-based finder function
		const findProductsByTuple = async (conditions: [string, string][]) => {
			return mockDb
				.selectFrom('products')
				.selectAll()
				.where((eb: MockExpressionBuilder) => {
					// Generate dynamic OR conditions for tuples
					const tupleConditions = conditions.map(([name, id]) =>
						// Using a simpler approach without tuples
						eb.and([eb('name', '=', name), eb('id', '=', id)])
					);

					// Combine conditions with OR
					return eb.or(tupleConditions);
				})
				.execute();
		};

		// Test with some sample data
		const products = await findProductsByTuple([
			['Product A', 'product1'],
			['Product B', 'product2'],
		]);

		// Verify the results
		expect(Array.isArray(products)).toBe(true);
		expect(products.length).toBe(2);
		expect(products[0].id).toBe('product1');
		expect(products[1].id).toBe('product2');
		expect(mockQueryChain.where).toHaveBeenCalled();
	});

	it('should support JSON operations with sql template tags', async () => {
		// Create mock data
		const jsonTestData = [
			{
				id: 'json1',
				data: JSON.stringify({
					user: {
						name: 'John',
						profile: {
							preferences: {
								theme: 'dark',
								notifications: true,
							},
						},
					},
				}),
			},
		];

		// Create mock query chain
		const mockQueryChain = {
			selectAll: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue(jsonTestData),
		};

		// Create mock database with required methods
		const mockDb = createMockDatabase<TestDB>({
			selectFrom: vi.fn().mockReturnValue(mockQueryChain),
		});

		// Add JSON capabilities to the mock db
		mockDb.fn.json = {
			extract: vi.fn().mockReturnValue(JSON.stringify({ theme: 'dark' })),
			path: vi.fn().mockReturnValue('$.user.profile.preferences.theme'),
		};

		// Test function to query JSON data
		const getUsersByTheme = async (theme: string) => {
			return mockDb
				.selectFrom('json_test')
				.selectAll()
				.where(
					sql`json_extract(data, '$.user.profile.preferences.theme')`,
					'=',
					theme
				)
				.execute();
		};

		// Test JSON query
		const results = await getUsersByTheme('dark');

		// Verify the results
		expect(results).toHaveLength(1);
		expect(results[0].id).toBe('json1');

		// Parse the JSON string to verify content
		const jsonData = JSON.parse(results[0].data);
		expect(jsonData.user.profile.preferences.theme).toBe('dark');
	});

	it('should support generic finders', async () => {
		// Create test data
		const testProducts = [{ id: 'product1', name: 'Product A' }];

		// Create mock query chain with properly typed methods
		const mockQueryChain = {
			selectAll: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue(testProducts),
		};

		// Create mock database with required methods
		const mockDb = createMockDatabase<TestDB>({
			selectFrom: vi.fn().mockReturnValue(mockQueryChain),
		});

		// Create a generic finder
		const findByTuple = async <T extends any[]>(
			columns: string[],
			values: T
		) => {
			if (columns.length !== values.length) {
				throw new Error('Columns and values must have the same length');
			}

			const query = mockDb.selectFrom('products').selectAll();

			for (let i = 0; i < columns.length; i++) {
				query.where(columns[i], '=', values[i]);
			}

			return query.execute();
		};

		// Test the generic finder
		const products = await findByTuple(
			['name', 'id'],
			['Product A', 'product1']
		);

		// Verify the results
		expect(products).toHaveLength(1);
		expect(products[0].id).toBe('product1');
		expect(products[0].name).toBe('Product A');

		// Verify that where was called twice with the correct parameters
		expect(mockQueryChain.where).toHaveBeenCalledTimes(2);
		expect(mockQueryChain.where).toHaveBeenNthCalledWith(
			1,
			'name',
			'=',
			'Product A'
		);
		expect(mockQueryChain.where).toHaveBeenNthCalledWith(
			2,
			'id',
			'=',
			'product1'
		);
	});
});
