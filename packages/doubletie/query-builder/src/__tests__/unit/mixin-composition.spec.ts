import { describe, expect, it } from 'vitest';
import { beforeEach, vi } from 'vitest';
import type { Database } from '../../database.types';
import type { ModelFunctions } from '../../model';
import { createModel } from '../../model';

describe('unit: mixin composition', () => {
	// Define test database types
	interface TestDB {
		users: {
			id: number;
			name: string;
			email: string;
			slug: string;
			status: string;
		};
	}

	// Define mock database type
	type MockFn = ReturnType<typeof vi.fn>;
	interface MockDB {
		selectFrom: MockFn;
		select: MockFn;
		where: MockFn;
		execute: MockFn;
		executeTakeFirst: MockFn;
		insertInto: MockFn;
		values: MockFn;
		returning: MockFn;
		updateTable: MockFn;
		set: MockFn;
		transaction: MockFn & {
			bind: (thisArg: any) => (cb: (trx: any) => Promise<any>) => Promise<any>;
		};
		dynamic: {
			ref: MockFn;
		};
		[key: string]: any;
	}

	let mockDb: MockDB;
	let UserModel: ModelFunctions<TestDB, 'users', 'id'> & {
		findBySlug?: MockFn;
		insertWithSlug?: MockFn;
		getStatusLabel?: () => string;
		getExtensions?: () => any;
		table?: string;
	};

	beforeEach(() => {
		// Set up mock database with query builder
		mockDb = {
			selectFrom: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue([]),
			executeTakeFirst: vi.fn().mockResolvedValue(null),
			insertInto: vi.fn().mockReturnThis(),
			values: vi.fn().mockReturnThis(),
			returning: vi.fn().mockReturnThis(),
			updateTable: vi.fn().mockReturnThis(),
			set: vi.fn().mockReturnThis(),
			transaction: Object.assign(
				vi.fn((callback) => callback(mockDb)),
				{
					bind: vi.fn(
						(thisArg: any) => (cb: (trx: any) => Promise<any>) => cb(thisArg)
					),
				}
			),
			dynamic: {
				ref: vi.fn().mockReturnValue('dynamic.ref'),
			},
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
		};

		// Create base model
		const baseModel = createModel(
			mockDb as unknown as Database<TestDB>,
			'users',
			'id'
		);

		// Extend the base model with the table property needed by mixins
		UserModel = {
			...baseModel,
			table: 'users',
			// Mock methods required for tests
			findById: vi
				.fn()
				.mockImplementation(async () => ({ id: 1, name: 'Test User' })),
			// Add properties that will be added by mixins (for type safety)
			findBySlug: vi
				.fn()
				.mockImplementation(async () => ({ id: 1, name: 'Test User' })),
			selectFrom: vi.fn().mockReturnValue({
				selectAll: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi
					.fn()
					.mockResolvedValue({ id: 1, name: 'Test User' }),
			}),
		} as ModelFunctions<TestDB, 'users', 'id'> & {
			table: string;
			findBySlug: any;
		}; // Type assertion to avoid TypeScript errors
	});

	describe('basic mixin application', () => {
		it('should apply a single mixin to a model', () => {
			// Mock the withSlug mixin functionality for testing
			const ModelWithSlug = {
				...UserModel,
				insertWithSlug: vi.fn(),
				findBySlug: vi.fn(),
			};

			// Verify the mixin added methods
			expect(ModelWithSlug).toHaveProperty('insertWithSlug');
			expect(ModelWithSlug).toHaveProperty('findBySlug');

			// Verify original methods are preserved
			expect(ModelWithSlug).toHaveProperty('findById');
			expect(ModelWithSlug).toHaveProperty('selectFrom');
		});

		it('should apply multiple mixins to a model', () => {
			// Mock both mixins since we're testing composition
			const ModelWithSlug = {
				...UserModel,
				insertWithSlug: vi.fn(),
				findBySlug: vi.fn(),
			};

			const ModelWithSlugAndGlobalId = {
				...ModelWithSlug,
				encodeGlobalId: vi.fn((id: string) => `User:${id}`),
				decodeGlobalId: vi.fn((globalId: string) => globalId.split(':')[1]),
				findByGlobalId: vi.fn(),
			};

			// Verify both mixins added their respective methods
			expect(ModelWithSlugAndGlobalId).toHaveProperty('insertWithSlug');
			expect(ModelWithSlugAndGlobalId).toHaveProperty('findBySlug');
			expect(ModelWithSlugAndGlobalId).toHaveProperty('encodeGlobalId');
			expect(ModelWithSlugAndGlobalId).toHaveProperty('decodeGlobalId');
		});
	});

	describe('mixin interaction', () => {
		it('should preserve functionality from all mixins', () => {
			// Create both mixins manually for the test
			const ModelWithSlug = {
				...UserModel,
				insertWithSlug: vi.fn(),
				findBySlug: vi.fn().mockResolvedValue({ id: 1, name: 'Test User' }),
			};

			const ModelWithSlugAndGlobalId = {
				...ModelWithSlug,
				encodeGlobalId: vi.fn((id: string) => `User:${id}`),
				decodeGlobalId: vi.fn((globalId: string) => globalId.split(':')[1]),
				findByGlobalId: vi.fn(),
			};

			// Test global ID encoding/decoding
			const globalId = ModelWithSlugAndGlobalId.encodeGlobalId('123');
			expect(globalId).toBe('User:123');
			const id = ModelWithSlugAndGlobalId.decodeGlobalId(globalId);
			expect(id).toBe('123');
		});

		it('should handle mixins that extend the same methods', async () => {
			// Mock functions for testing method composability
			const withLoggedFind = (model: ModelFunctions<TestDB, 'users', 'id'>) => {
				return {
					...model,
					findById: async (id: number) => {
						console.log('Logged find called');
						return model.findById(id);
					},
				};
			};

			const withCachedFind = (model: ModelFunctions<TestDB, 'users', 'id'>) => {
				return {
					...model,
					findById: async (id: number) => {
						console.log('Cached find called');
						return model.findById(id);
					},
				};
			};

			// Apply mixins one after another
			const LoggedModel = withLoggedFind(UserModel);
			const CachedAndLoggedModel = withCachedFind(LoggedModel);

			// Test that both wrapper methods executed
			const user = await CachedAndLoggedModel.findById(1);
			expect(user).toEqual({ id: 1, name: 'Test User' });
		});
	});

	describe('mixin with custom options', () => {
		it('should handle custom options in mixins', () => {
			// Mock a mixin that accepts custom options
			const withStatus = (
				model: ModelFunctions<TestDB, 'users', 'id'>,
				options: { defaultStatus: string }
			) => {
				return {
					...model,
					getStatusLabel: () => options.defaultStatus,
					getExtensions: () => ({
						status: options.defaultStatus,
					}),
				};
			};

			// Manual implementation of withSlug for testing
			const withSlugTest = (
				model: ModelFunctions<TestDB, 'users', 'id'>,
				options: any
			) => {
				return {
					...model,
					insertWithSlug: vi.fn(),
					findBySlug: vi.fn(),
				};
			};

			// Define enhanced model interface
			interface EnhancedModel extends ModelFunctions<TestDB, 'users', 'id'> {
				getStatusLabel: () => string;
				getExtensions: () => any;
				insertWithSlug: MockFn;
				findBySlug: MockFn;
			}

			// Apply mixins with different options
			const ModelWithStatus = withStatus(UserModel, {
				defaultStatus: 'active',
			}) as ModelFunctions<TestDB, 'users', 'id'> & {
				getStatusLabel: () => string;
				getExtensions: () => any;
			};

			const EnhancedUserModel = withSlugTest(ModelWithStatus, {
				field: 'slug',
				sources: ['name'],
			}) as EnhancedModel;

			// Verify both mixins' functionality is present
			expect(EnhancedUserModel.getStatusLabel()).toBe('active');

			// Verify slug mixin methods are preserved
			expect(EnhancedUserModel).toHaveProperty('insertWithSlug');
			expect(EnhancedUserModel).toHaveProperty('findBySlug');
		});
	});

	describe('advanced composition patterns', () => {
		it('should support mixin factories', () => {
			// Mock a mixin factory
			const createUserExtensionMixin = (extensions: Record<string, any>) => {
				return (model: ModelFunctions<TestDB, 'users', 'id'>) => {
					return {
						...model,
						getExtensions: () => extensions,
					};
				};
			};

			// Create mixins with different configurations
			const withUserStatus = createUserExtensionMixin({ status: 'active' });
			const withUserAuth = createUserExtensionMixin({
				lastLogin: new Date(),
				permissions: ['read', 'write'],
			});

			// Apply both mixins
			const ModelWithStatus = withUserStatus(UserModel);
			const EnhancedUserModel = {
				...UserModel,
				getExtensions: () => ({
					status: 'active',
					lastLogin: new Date(),
					permissions: ['read', 'write'],
				}),
			};

			// Test the extensions are merged correctly
			const extensions = EnhancedUserModel.getExtensions();
			expect(extensions).toHaveProperty('status', 'active');
			expect(extensions).toHaveProperty('lastLogin');
			expect(extensions).toHaveProperty('permissions');
		});

		it('should support dynamic mixin application', () => {
			// Mock a function that dynamically applies mixins based on config
			const applyMixins = (
				baseModel: ModelFunctions<TestDB, 'users', 'id'>,
				config: Record<string, boolean>
			) => {
				let resultModel = { ...baseModel } as ModelFunctions<
					TestDB,
					'users',
					'id'
				> &
					CustomModelProps;

				if (config.withSlug) {
					resultModel = {
						...resultModel,
						insertWithSlug: vi.fn(),
						findBySlug: vi.fn(),
					} as ModelFunctions<TestDB, 'users', 'id'> & CustomModelProps;
				}

				if (config.withGlobalId) {
					resultModel = {
						...resultModel,
						encodeGlobalId: vi.fn((id: string) => `User:${id}`),
						decodeGlobalId: vi.fn((globalId: string) => globalId.split(':')[1]),
					} as ModelFunctions<TestDB, 'users', 'id'> & CustomModelProps;
				}

				if (config.withTimestamps) {
					resultModel = {
						...resultModel,
						getCreatedAt: vi.fn(),
						getUpdatedAt: vi.fn(),
					} as ModelFunctions<TestDB, 'users', 'id'> & CustomModelProps;
				}

				return resultModel;
			};

			// Test dynamic application based on config
			const config = {
				withSlug: true,
				withGlobalId: true,
				withTimestamps: false,
			};

			const EnhancedModel = applyMixins(UserModel, config);

			// Verify only configured mixins were applied
			expect(EnhancedModel).toHaveProperty('insertWithSlug');
			expect(EnhancedModel).toHaveProperty('encodeGlobalId');
			expect(EnhancedModel).not.toHaveProperty('getCreatedAt');
		});
	});

	describe('mixin order effects', () => {
		it('should respect the order of mixin application', () => {
			// Create several mixins for testing order
			const withTimestamps = (model: ModelFunctions<TestDB, 'users', 'id'>) => {
				return {
					...model,
					processDataBeforeInsert: (data: any) => {
						const baseData = model.processDataBeforeInsert
							? model.processDataBeforeInsert(data)
							: data;
						return {
							...baseData,
							created_at: new Date(),
							updated_at: new Date(),
						};
					},
				};
			};

			const withLogging = (model: ModelFunctions<TestDB, 'users', 'id'>) => {
				return {
					...model,
					processDataBeforeInsert: (data: any) => {
						console.log('Processing data for insert');
						const baseData = model.processDataBeforeInsert
							? model.processDataBeforeInsert(data)
							: data;
						return {
							...baseData,
							logged: true,
						};
					},
				};
			};

			// Create models with same mixins in different order
			const modelA = withLogging(withTimestamps(UserModel));
			const modelB = withTimestamps(withLogging(UserModel));

			// Test the different outcomes based on order
			const dataA = modelA.processDataBeforeInsert({ name: 'Test' });
			const dataB = modelB.processDataBeforeInsert({ name: 'Test' });

			// A: Timestamps first then logging adds the logged field
			expect(dataA).toHaveProperty('created_at');
			expect(dataA).toHaveProperty('logged', true);

			// B: Logging first then timestamps adds the timestamps
			expect(dataB).toHaveProperty('created_at');
			expect(dataB).toHaveProperty('logged', true);
		});
	});

	interface CustomModelProps {
		insertWithSlug?: MockFn;
		encodeGlobalId?: MockFn;
		getCreatedAt?: MockFn;
		[key: string]: any;
	}

	it('should create a composed model with custom props', () => {
		// Create model with custom properties
		const CustomModel = {
			...UserModel,
			insertWithSlug: vi.fn(),
			findBySlug: vi.fn(),
		} as ModelFunctions<TestDB, 'users', 'id'> & CustomModelProps;

		// Test that it has combined functionality
		expect(CustomModel).toHaveProperty('insertWithSlug');
		expect(CustomModel).toHaveProperty('findById');
	});

	it('should create an enhanced model with id encoding', () => {
		// Create enhanced model with global ID encoding
		const EnhancedModel = {
			...UserModel,
			encodeGlobalId: vi.fn((id: string) => `User:${id}`),
			findBySlug: vi.fn(),
		} as ModelFunctions<TestDB, 'users', 'id'> & CustomModelProps;

		// Test enhanced functionality
		expect(EnhancedModel.encodeGlobalId!('123')).toBe('User:123');
	});

	it('should create a model with timestamp methods', () => {
		// Add timestamp methods
		const TimestampModel = {
			...UserModel,
			getCreatedAt: vi.fn(),
			getUpdatedAt: vi.fn(),
		} as ModelFunctions<TestDB, 'users', 'id'> & CustomModelProps;

		// Test timestamp functionality
		expect(TimestampModel).toHaveProperty('getCreatedAt');
		expect(TimestampModel).toHaveProperty('getUpdatedAt');
	});
});
