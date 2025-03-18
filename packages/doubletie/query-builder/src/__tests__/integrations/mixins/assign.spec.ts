import type { Selectable } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import withAssign, { type ModelWithAssign } from '../../../mixins/assign';
import { createModel } from '../../../model';
import {
	type DB,
	cleanupDatabase,
	db,
	initializeDatabase,
	toSqliteDate,
} from '../../fixtures/migration';

// Define a type for a user record
type UserRecord = Selectable<DB['users']>;

// Define a type for a model with greeting method
interface WithGreeting {
	getGreeting(): string;
}

// Define a combined model type with both assign and greeting
interface ModelWithAssignAndGreeting
	extends ModelWithAssign<DB, 'users', 'id'>,
		WithGreeting {}

describe('integration: assign mixin', () => {
	beforeEach(async () => {
		await initializeDatabase();
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('should assign new properties to a model instance', async () => {
		// Create the model for this test
		const UserModel = createModel(db, 'users', 'id');

		// Apply the mixin
		const UserWithAssign = withAssign(UserModel);

		// First, create a user
		const user = await UserModel.insertInto()
			.values({
				email: 'test@example.com',
				name: 'Test User',
				username: 'testuser',
				password: 'password123',
				status: 'active',
				followersCount: 0,
				updatedAt: toSqliteDate(new Date()),
				createdAt: toSqliteDate(new Date()),
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// Create a model instance
		const userInstance = {
			...UserWithAssign,
			...user,
		};

		// Data to assign
		const newData = {
			name: 'Updated Name',
			status: 'inactive',
			followersCount: 10,
		};

		// Use the assign method
		const updatedUser = userInstance.assign(newData);

		// Verify the result
		expect(updatedUser.name).toBe('Updated Name');
		expect(updatedUser.status).toBe('inactive');
		expect(updatedUser.followersCount).toBe(10);
		expect(updatedUser.email).toBe('test@example.com');
		expect(updatedUser.username).toBe('testuser');
		expect(updatedUser.id).toBe(user.id);
	});

	it('should preserve original instance when assigning new data', async () => {
		// Create the model for this test
		const UserModel = createModel(db, 'users', 'id');

		// Apply the mixin
		const UserWithAssign = withAssign(UserModel);

		// First, create a user
		const user = await UserModel.insertInto()
			.values({
				email: 'immutable@example.com',
				name: 'Immutable User',
				username: 'immutableuser',
				password: 'password123',
				status: 'active',
				followersCount: 0,
				updatedAt: toSqliteDate(new Date()),
				createdAt: toSqliteDate(new Date()),
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// Create a model instance
		const userInstance = {
			...UserWithAssign,
			...user,
		};

		// Data to assign
		const newData = {
			name: 'Changed Name',
			status: 'inactive',
		};

		// Use the assign method
		const updatedUser = userInstance.assign(newData);

		// Verify the original instance is unchanged
		expect(userInstance.name).toBe('Immutable User');
		expect(userInstance.status).toBe('active');

		// Verify the new instance has the updated properties
		expect(updatedUser.name).toBe('Changed Name');
		expect(updatedUser.status).toBe('inactive');
	});

	it('should work with database operations after assign', async () => {
		// Create the model for this test
		const UserModel = createModel(db, 'users', 'id');

		// Apply the mixin
		const UserWithAssign = withAssign(UserModel);

		// First, create a user
		const user = await UserModel.insertInto()
			.values({
				email: 'dbops@example.com',
				name: 'DB Ops User',
				username: 'dbopsuser',
				password: 'password123',
				status: 'active',
				followersCount: 0,
				updatedAt: toSqliteDate(new Date()),
				createdAt: toSqliteDate(new Date()),
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// Create a model instance
		const userInstance = {
			...UserWithAssign,
			...user,
		};

		// Data to assign
		const newData = {
			name: 'Updated DB User',
			status: 'inactive',
			followersCount: 5,
		};

		// Use the assign method
		const updatedUser = userInstance.assign(newData);

		// Update the user in the database
		await UserModel.updateTable()
			.where('id', '=', user.id)
			.set({
				name: updatedUser.name,
				status: updatedUser.status,
				followersCount: updatedUser.followersCount,
			})
			.execute();

		// Fetch the user from the database to verify changes
		const fetchedUser = await UserModel.selectFrom()
			.where('id', '=', user.id)
			.selectAll()
			.executeTakeFirstOrThrow();

		// Verify the database was updated with the assigned values
		expect(fetchedUser.name).toBe('Updated DB User');
		expect(fetchedUser.status).toBe('inactive');
		expect(fetchedUser.followersCount).toBe(5);
	});

	it('should work with other mixins', async () => {
		// Create the model for this test
		const UserModel = createModel(db, 'users', 'id');

		// Create a simple mixin that adds a greeting method
		const withGreeting = (model: typeof UserModel) => {
			return {
				...model,
				getGreeting(): string {
					return `Hello, ${(this as any).name}!`;
				},
			};
		};

		// Apply both mixins
		const UserWithGreeting = withGreeting(UserModel);
		const UserWithBoth = withAssign(UserWithGreeting);

		// First, create a user
		const user = await UserModel.insertInto()
			.values({
				email: 'mixins@example.com',
				name: 'Mixins User',
				username: 'mixinsuser',
				password: 'password123',
				status: 'active',
				followersCount: 0,
				updatedAt: toSqliteDate(new Date()),
				createdAt: toSqliteDate(new Date()),
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// Create a model instance with both mixins
		const userInstance = {
			...UserWithBoth,
			...user,
		} as ModelWithAssignAndGreeting & UserRecord;

		// Verify the greeting works
		expect(userInstance.getGreeting()).toBe('Hello, Mixins User!');

		// Assign new data
		const updatedUser = userInstance.assign({
			name: 'Updated Mixins User',
		});

		// Verify both mixins still work after assign
		expect(updatedUser.getGreeting()).toBe('Hello, Updated Mixins User!');
	});
});
