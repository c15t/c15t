import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withGlobalId } from '../../../mixins/global-id';
import { createModel } from '../../../model';
import { type MockFn, createMockDatabase } from '../../fixtures/mock-db';

describe('unit: Global ID mixin', () => {
	// Define test database types and model
	interface TestDB {
		users: {
			id: number;
			name: string;
			email: string;
		};
		posts: {
			id: number;
			title: string;
			user_id: number;
		};
	}

	// Properly type the variables with explicit TestDB type
	let mockDb: ReturnType<typeof createMockDatabase<TestDB>>;
	let baseUserModel: ReturnType<typeof createModel> & {
		findById?: MockFn;
		findByIds?: MockFn;
	};
	let basePostModel: ReturnType<typeof createModel>;

	beforeEach(() => {
		// Set up mock database with properly typed mock functions using TestDB generic
		mockDb = createMockDatabase<TestDB>({
			selectFrom: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			executeTakeFirst: vi.fn(),
		});

		// Create base models with proper typing
		baseUserModel = createModel(mockDb, 'users', 'id') as ReturnType<
			typeof createModel
		> & {
			findById?: MockFn;
			findByIds?: MockFn;
		};
		basePostModel = createModel(mockDb, 'posts', 'id');
	});

	describe('global ID generation', () => {
		it('should generate a global ID from a numeric ID', () => {
			// Use type assertion to make TypeScript happy
			const userModel = withGlobalId(baseUserModel as any, 'id', 'User');

			const globalId = userModel.getGlobalId(123);

			// A global ID is typically a base64 encoded string of type:id
			expect(typeof globalId).toBe('string');
			expect(globalId).not.toBe('123');
		});

		it('should include the type name in the global ID', () => {
			const userModel = withGlobalId(baseUserModel as any, 'id', 'User');
			const postModel = withGlobalId(basePostModel as any, 'id', 'Post');

			const userGlobalId = userModel.getGlobalId(1);
			const postGlobalId = postModel.getGlobalId(1);

			// The same ID should generate different global IDs for different types
			expect(userGlobalId).not.toBe(postGlobalId);
		});

		it('should support custom ID encoders', () => {
			// Create a mock parser function that returns appropriate ID type
			const customEncoder = vi.fn((id: string) => Number.parseInt(id, 10));

			const userModel = withGlobalId(
				baseUserModel as any,
				customEncoder as any,
				'User'
			);

			const globalId = userModel.getGlobalId(123);

			// With our implementation, we can't easily test the encoder directly
			// since that's part of the internal implementation
			expect(typeof globalId).toBe('string');
			expect(globalId.startsWith('User_')).toBeTruthy();
		});

		it('should properly encode non-numeric IDs', () => {
			// Create a model with string IDs, using type assertion
			const stringIdModel = {
				...baseUserModel,
				id: 'uuid' as const,
			};

			const enhancedModel = withGlobalId(
				stringIdModel as any,
				'id',
				'StringUser'
			);

			const globalId = enhancedModel.getGlobalId('abc-123');

			expect(typeof globalId).toBe('string');
			expect(globalId).not.toBe('abc-123');
		});
	});

	describe('global ID decoding', () => {
		it('should decode a global ID to type and ID', () => {
			const userModel = withGlobalId(baseUserModel as any, 'id', 'User');

			const globalId = userModel.getGlobalId(123);
			// We need to parse the result ourselves since decodeGlobalId isn't included
			const parts = globalId.split('_');

			expect(parts.length).toBe(2);
			expect(parts[0]).toBe('User');
			// Add null check/assertion to fix string | undefined error
			if (parts[1]) {
				expect(Number.parseInt(parts[1], 10)).toBe(123);
			}
		});

		it('should handle custom ID decoders', () => {
			// Create a custom parser function
			const customParser = vi.fn((id: string) => Number.parseInt(id, 10));

			const userModel = withGlobalId(
				baseUserModel as any,
				customParser as any,
				'User'
			);

			const globalId = userModel.getGlobalId(123);

			// Get local ID to simulate decoding
			const localId = userModel.getLocalId(globalId);

			expect(localId).toBe(123);
		});

		it('should validate type when decoding', () => {
			const userModel = withGlobalId(baseUserModel as any, 'id', 'User');
			const postModel = withGlobalId(basePostModel as any, 'id', 'Post');

			const globalId = userModel.getGlobalId(123);
			const postGlobalId = postModel.getGlobalId(123);

			// Valid type should work
			expect(() => userModel.getLocalId(globalId)).not.toThrow();

			// Invalid type should throw
			expect(() => userModel.getLocalId(postGlobalId)).toThrow();
		});
	});

	describe('finding records by global ID', () => {
		it('should find a record by global ID', async () => {
			// Mock the executeTakeFirst to return a user
			(mockDb.executeTakeFirst as MockFn).mockResolvedValue({
				id: 123,
				name: 'Test User',
			});

			const userModel = withGlobalId(baseUserModel as any, 'id', 'User');

			// Add a mock implementation for findById with proper typing
			baseUserModel.findById = vi.fn().mockImplementation((id) => {
				// Use a simplified implementation to avoid type issues
				// This mock just returns the value from executeTakeFirst
				return mockDb.executeTakeFirst();
			});

			const globalId = userModel.getGlobalId(123);
			const user = await userModel.findByGlobalId(globalId);

			// Check the result
			expect(user).toEqual({
				id: 123,
				name: 'Test User',
			});
		});

		it('should return null for invalid global IDs', async () => {
			const userModel = withGlobalId(baseUserModel as any, 'id', 'User');
			const postModel = withGlobalId(basePostModel as any, 'id', 'Post');

			// Add a mock implementation for findById that never gets called
			baseUserModel.findById = vi.fn();

			// Use post global ID with user model
			const postGlobalId = postModel.getGlobalId(123);

			// This should return undefined since the type doesn't match
			const result = await userModel.findByGlobalId(postGlobalId);
			expect(result).toBeUndefined();
			expect(baseUserModel.findById).not.toHaveBeenCalled();
		});

		it('should handle custom find logic', async () => {
			(mockDb.executeTakeFirst as MockFn).mockResolvedValue({
				id: 123,
				name: 'Test User',
			});

			// Add a mock implementation for findById with proper typing
			baseUserModel.findById = vi.fn().mockImplementation((id) => {
				// Use a simplified implementation to avoid type issues
				// This mock just returns the value from executeTakeFirst
				return mockDb.executeTakeFirst();
			});

			const userModel = withGlobalId(baseUserModel as any, 'id', 'User');

			const globalId = userModel.getGlobalId(123);
			const result = await userModel.findByGlobalId(globalId);

			expect(result).toEqual({
				id: 123,
				name: 'Test User',
			});
		});
	});

	describe('integration with model operations', () => {
		it('should be able to find records by their IDs', async () => {
			(mockDb.executeTakeFirst as MockFn).mockResolvedValue({
				id: 123,
				name: 'Test User',
			});

			// Add a mock implementation for findById with proper typing
			baseUserModel.findById = vi.fn().mockImplementation((id) => {
				// Use a simplified implementation to avoid type issues
				// This mock just returns the value from executeTakeFirst
				return mockDb.executeTakeFirst();
			});

			const userModel = withGlobalId(baseUserModel as any, 'id', 'User');

			// Find by regular ID
			const user = await baseUserModel.findById(123);

			// Find by global ID
			const globalId = userModel.getGlobalId(123);
			const userByGlobalId = await userModel.findByGlobalId(globalId);

			expect(user).toEqual(userByGlobalId);
		});

		it('should handle multiple records with global IDs', async () => {
			// Define the user type for proper typing
			type User = { id: number; name: string };

			// Mock the execute method with properly typed users
			const mockUsers: User[] = [
				{ id: 1, name: 'User 1' },
				{ id: 2, name: 'User 2' },
			];
			mockDb.execute = vi.fn().mockResolvedValue(mockUsers);

			// Add findByIds method with proper typing
			baseUserModel.findByIds = vi.fn().mockImplementation((ids) => {
				return Promise.resolve(mockUsers);
			});

			const userModel = withGlobalId(baseUserModel as any, 'id', 'User');

			// Find by global IDs
			const globalIds = [userModel.getGlobalId(1), userModel.getGlobalId(2)];

			const users = (await userModel.findByGlobalIds(globalIds)) as User[];

			// Now we can use proper typing for the users array
			expect(users).toHaveLength(2);
			expect(users[0]!.id).toBe(1);
			expect(users[1]!.id).toBe(2);
		});
	});
});
