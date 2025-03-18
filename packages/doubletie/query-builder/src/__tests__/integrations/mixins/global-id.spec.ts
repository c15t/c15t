import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { withGlobalId } from '../../../mixins/global-id';
import { createModel } from '../../../model';
import {
	cleanupDatabase,
	db,
	initializeDatabase,
} from '../../fixtures/migration';

describe('integration: Global ID mixin', () => {
	let UserModel: ReturnType<typeof withGlobalId>;

	beforeEach(async () => {
		await initializeDatabase();
		const baseModel = createModel(db, 'users', 'id');
		UserModel = withGlobalId(baseModel, 'id', 'User');
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('should generate correct global IDs for database records', async () => {
		// Create a test user
		const userData = {
			email: 'test@example.com',
			name: 'Test User',
			username: 'testuser',
			password: 'password123',
			followersCount: 0,
			status: 'active',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const insertResult = await UserModel.insertInto()
			.values(userData)
			.executeTakeFirstOrThrow();
		const userId = Number(insertResult.insertId);

		const user = await UserModel.findById(userId);
		if (!user) throw new Error('User not found');

		const globalId = UserModel.getGlobalId(user.id);

		expect(globalId).toBeTypeOf('string');
		expect(globalId).not.toBe(String(userId));

		// The decoded ID should match the original
		const localId = UserModel.getLocalId(globalId);
		expect(Number(localId)).toBe(userId);
	});

	it('should find records by global ID', async () => {
		// Create a test user
		const userData = {
			email: 'global@example.com',
			name: 'Global User',
			username: 'globaluser',
			password: 'password123',
			followersCount: 0,
			status: 'active',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const insertResult = await UserModel.insertInto()
			.values(userData)
			.executeTakeFirstOrThrow();
		const userId = Number(insertResult.insertId);

		// Get a user to generate a global ID
		const originalUser = await UserModel.findById(userId);
		if (!originalUser) throw new Error('User not found');

		const globalId = UserModel.getGlobalId(originalUser.id);

		// Find the user by global ID
		const user = await UserModel.findByGlobalId(globalId);

		expect(user).toBeDefined();
		expect(Number(user?.id)).toBe(userId);
		expect(user?.name).toBe('Global User');
		expect(user?.email).toBe('global@example.com');
	});

	it('should return undefined for invalid global IDs', async () => {
		// Create an invalid global ID
		const invalidGlobalId = 'InvalidType_1';

		const user = await UserModel.findByGlobalId(invalidGlobalId);

		expect(user).toBeUndefined();
	});

	it('should find records by multiple global IDs', async () => {
		// Create test users
		const user1Data = {
			email: 'user1@example.com',
			name: 'User One',
			username: 'userone',
			password: 'password123',
			followersCount: 0,
			status: 'active',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const user2Data = {
			email: 'user2@example.com',
			name: 'User Two',
			username: 'usertwo',
			password: 'password123',
			followersCount: 0,
			status: 'active',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const insert1 = await UserModel.insertInto()
			.values(user1Data)
			.executeTakeFirstOrThrow();
		const insert2 = await UserModel.insertInto()
			.values(user2Data)
			.executeTakeFirstOrThrow();

		const user1Id = Number(insert1.insertId);
		const user2Id = Number(insert2.insertId);

		// Generate global IDs for both users
		const globalId1 = UserModel.getGlobalId(user1Id);
		const globalId2 = UserModel.getGlobalId(user2Id);

		// Find users by global IDs
		const users = await UserModel.findByGlobalIds([globalId1, globalId2]);

		expect(users).toHaveLength(2);
		expect(Number(users[0].id)).toBe(user1Id);
		expect(Number(users[1].id)).toBe(user2Id);
	});
});
