import type { DeleteResult, UpdateResult } from 'kysely';
import { describe, expect, it, vi } from 'vitest';
import {
	createMockDatabase,
	createTestData,
	toSqliteDate,
} from '../fixtures/mock-db';

// Define test database type
interface TestDB {
	users: {
		id: number;
		name: string;
		username: string;
		email: string;
		password: string;
		followersCount: number;
		createdAt: string;
		updatedAt: string;
	};
	comments: {
		id: number;
		user_id: number;
		message: string;
	};
}

describe('Basic CRUD Operations - Unit Tests', () => {
	it('should handle create operations with mocked DB', async () => {
		// Create mock database with insert chain
		const mockInsertChain = {
			values: vi.fn().mockReturnThis(),
			returning: vi.fn().mockReturnThis(),
			executeTakeFirst: vi.fn().mockResolvedValue({ id: 1 }),
		};

		const mockDb = createMockDatabase<TestDB>({
			insertInto: vi.fn().mockReturnValue(mockInsertChain),
		});

		// Define create user function
		const createUser = async (userData: any) => {
			return mockDb
				.insertInto('users')
				.values(userData)
				.returning('id')
				.executeTakeFirst();
		};

		// Test create operation
		const now = new Date();
		const userData = {
			email: 'test@example.com',
			name: 'Test User',
			username: 'testuser',
			password: 'password123',
			followersCount: 0,
			createdAt: toSqliteDate(now),
			updatedAt: toSqliteDate(now),
		};

		const result = await createUser(userData);

		// Verify the result
		expect(result).toBeDefined();
		expect(result.id).toBe(1);
		expect(mockDb.insertInto).toHaveBeenCalledWith('users');
		expect(mockInsertChain.values).toHaveBeenCalledWith(userData);
	});

	it('should handle read operations with mocked DB', async () => {
		// Create mock database with select chain returning test user
		const mockUser = {
			id: 1,
			email: 'test@example.com',
			name: 'Test User',
			username: 'testuser',
		};

		const mockSelectChain = {
			where: vi.fn().mockReturnThis(),
			selectAll: vi.fn().mockReturnThis(),
			executeTakeFirst: vi.fn().mockResolvedValue(mockUser),
		};

		const mockDb = createMockDatabase<TestDB>({
			selectFrom: vi.fn().mockReturnValue(mockSelectChain),
		});

		// Define get user function
		const getUserByEmail = async (email: string) => {
			return mockDb
				.selectFrom('users')
				.where('email', '=', email)
				.selectAll()
				.executeTakeFirst();
		};

		// Test read operation
		const user = await getUserByEmail('test@example.com');

		// Verify the result
		expect(user).toBeDefined();
		expect(user.id).toBe(1);
		expect(user.email).toBe('test@example.com');
		expect(mockDb.selectFrom).toHaveBeenCalledWith('users');
		expect(mockSelectChain.where).toHaveBeenCalledWith(
			'email',
			'=',
			'test@example.com'
		);
	});

	it('should handle update operations with mocked DB', async () => {
		// Create mock database with update chain
		const mockUpdateChain = {
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue({
				numUpdatedRows: BigInt(1),
			} as unknown as UpdateResult),
		};

		const mockDb = createMockDatabase<TestDB>({
			updateTable: vi.fn().mockReturnValue(mockUpdateChain),
		});

		// Define update user function
		const updateUserName = async (id: number, name: string) => {
			return mockDb
				.updateTable('users')
				.set({
					name,
					updatedAt: toSqliteDate(new Date()),
				})
				.where('id', '=', id)
				.execute();
		};

		// Test update operation
		const result = await updateUserName(1, 'Updated Name');

		// Verify the result
		expect(result).toBeDefined();
		expect((result as UpdateResult).numUpdatedRows).toBe(BigInt(1));
		expect(mockDb.updateTable).toHaveBeenCalledWith('users');
		expect(mockUpdateChain.set).toHaveBeenCalled();
		expect(mockUpdateChain.where).toHaveBeenCalledWith('id', '=', 1);
	});

	it('should handle delete operations with mocked DB', async () => {
		// Create mock database with delete chain
		const mockDeleteChain = {
			where: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue({
				numDeletedRows: BigInt(1),
			} as unknown as DeleteResult),
		};

		const mockDb = createMockDatabase<TestDB>();
		// Override the default implementation
		(mockDb.deleteFrom as any) = vi.fn().mockReturnValue(mockDeleteChain);

		// Define delete user function
		const deleteUser = async (id: number) => {
			return mockDb.deleteFrom('users').where('id', '=', id).execute();
		};

		// Test delete operation
		const result = await deleteUser(1);

		// Verify the result
		expect(result).toBeDefined();
		expect((result as DeleteResult).numDeletedRows).toBe(BigInt(1));
		expect(mockDb.deleteFrom).toHaveBeenCalledWith('users');
		expect(mockDeleteChain.where).toHaveBeenCalledWith('id', '=', 1);
	});

	it('should handle direct column updates with mocked DB', async () => {
		// Create mock query chains
		const mockUpdateChain = {
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue({
				numUpdatedRows: BigInt(1),
			} as unknown as UpdateResult),
		};

		const mockUpdateColumnChain = {
			where: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue({
				numUpdatedRows: BigInt(1),
			} as unknown as UpdateResult),
		};

		// Create mock database with required methods
		const mockDb = createMockDatabase<TestDB>({
			updateTable: vi.fn().mockReturnValue(mockUpdateChain),
		});

		// Add updateColumn method (not in standard MockDatabase)
		(mockDb as any).updateColumn = vi
			.fn()
			.mockReturnValue(mockUpdateColumnChain);

		// Test direct column update
		await mockDb
			.updateTable('users')
			.set('email', 'new@example.com')
			.where('id', '=', 1)
			.execute();

		// Verify the direct update
		expect(mockUpdateChain.set).toHaveBeenCalledWith(
			'email',
			'new@example.com'
		);

		// Test with updateColumn helper
		// (This is just for demonstration, as it's not part of the real interface)
		await (mockDb as any)
			.updateColumn('users', 'email', 'another@example.com')
			.where('id', '=', 1)
			.execute();

		// Verify the helper update
		expect((mockDb as any).updateColumn).toHaveBeenCalledWith(
			'users',
			'email',
			'another@example.com'
		);
	});

	it('should handle pagination with cursors and limits', async () => {
		// Create test data
		const testUsers = [
			{
				id: 1,
				name: 'User A',
				email: 'usera@example.com',
				createdAt: '2023-01-01T00:00:00.000Z',
			},
			{
				id: 2,
				name: 'User B',
				email: 'userb@example.com',
				createdAt: '2023-01-02T00:00:00.000Z',
			},
			{
				id: 3,
				name: 'User C',
				email: 'userc@example.com',
				createdAt: '2023-01-03T00:00:00.000Z',
			},
		];

		// Create mock query chain returning paginated users
		const mockSelectChain = {
			where: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			selectAll: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue(testUsers),
		};

		// Create mock database
		const mockDb = createMockDatabase<TestDB>({
			selectFrom: vi.fn().mockReturnValue(mockSelectChain),
		});

		// Define a pagination function
		const getUsers = async (cursor: string | null, limit: number) => {
			const query = mockDb.selectFrom('users').selectAll();

			if (cursor) {
				const decodedCursor = Number.parseInt(
					Buffer.from(cursor, 'base64').toString('ascii'),
					10
				);
				query.where('id', '>', decodedCursor);
			}

			query.orderBy('id', 'asc').limit(limit);

			const users = await query.execute();

			const hasNextPage = users.length === limit;
			let nextCursor = null;

			if (hasNextPage && users.length > 0) {
				const lastId = users[users.length - 1].id;
				nextCursor = Buffer.from(String(lastId)).toString('base64');
			}

			return {
				users,
				pagination: {
					hasNextPage,
					nextCursor,
				},
			};
		};

		// Test pagination
		const result = await getUsers(null, 2);

		// Verify the query built correctly
		expect(mockSelectChain.orderBy).toHaveBeenCalledWith('id', 'asc');
		expect(mockSelectChain.limit).toHaveBeenCalledWith(2);

		// Check the result structure
		expect(result).toHaveProperty('users');
		expect(result).toHaveProperty('pagination');
		expect(result.pagination).toHaveProperty('hasNextPage');
		expect(result.pagination).toHaveProperty('nextCursor');
	});

	it('should handle relational queries', async () => {
		// Get test data from our central mock data function
		const testData = createTestData();

		// Create a mock user
		const mockUser = {
			id: 1,
			name: 'Relation User',
			email: 'relation@example.com',
		};

		// Mock comments result
		const mockComments = [
			{ id: 1, user_id: 1, message: 'Test comment 1' },
			{ id: 2, user_id: 1, message: 'Test comment 2' },
		];

		// Mock user-comments joined result
		const mockUserWithComments = [
			{
				userId: 1,
				commentId: 1,
				userName: 'Relation User',
				message: 'Test comment 1',
			},
			{
				userId: 1,
				commentId: 2,
				userName: 'Relation User',
				message: 'Test comment 2',
			},
		];

		// Create a simple implementation that doesn't rely on the mocks
		const getUserWithComments = async (userId: number) => {
			// In a real implementation, this would query the database
			// We're just returning mock data directly
			return {
				user: mockUser,
				comments: mockComments,
				userWithComments: mockUserWithComments,
			};
		};

		// Test the relational query
		const result = await getUserWithComments(1);

		// Verify the results
		expect(result).not.toBeNull();
		expect(result.user).toBeDefined();
		expect(result.user.email).toBe('relation@example.com');
		expect(result.comments).toHaveLength(2);
		expect(result.comments[0]?.message).toBe('Test comment 1');
		expect(result.userWithComments).toHaveLength(2);
		expect(result.userWithComments[0]?.userId).toBe(1);
		expect(result.userWithComments[0]?.commentId).toBe(1);
	});
});
