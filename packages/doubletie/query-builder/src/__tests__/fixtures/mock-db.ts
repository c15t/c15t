/**
 * Mock database utilities for testing
 *
 * This file contains mock implementations of the Database class and related utilities
 * to simplify testing and provide type-compatible mocks for Kysely and the Database class.
 */

import type {
	OrderByDirectionExpression,
	ReferenceExpression,
	SelectExpression,
} from 'kysely';
import { vi } from 'vitest';
import type { Database } from '../../database.types';
import type { ModelRegistry } from '../../database.types';
import { withIdGenerator } from '../../mixins/id-generator';
import { createModel } from '../../model';

// Define helper types for mocks
export type MockFn = ReturnType<typeof vi.fn> & {
	mockImplementation: (fn: (...args: any[]) => any) => MockFn;
	mockResolvedValue: (value: any) => MockFn;
	mockReset: () => MockFn;
};

export type MockReturnThis = MockFn & { mockReturnThis: () => MockReturnThis };

/**
 * Create a mock function that returns itself, useful for chainable method mocks
 */
export function createMockReturnThis(): MockReturnThis {
	const fn = vi.fn() as MockReturnThis;
	fn.mockReturnThis = () => fn;
	fn.mockReturnThis();
	return fn;
}

/**
 * Mock expression builder for where clauses and conditions
 * This interface mimics Kysely's ExpressionBuilder with simplified types
 */
export interface MockExpressionBuilder {
	(column: string, operator: string, value: any): any;
	and: (conditions: any[]) => any;
	or: (conditions: any[]) => any;
	not: (condition: any) => any;
	between: (column: string, from: any, to: any) => any;
	exists: (subquery: any) => any;
	isNull: (column: string) => any;
	isNotNull: (column: string) => any;
}

/**
 * Create a mock expression builder that can be used in where clauses
 */
export function createMockExpressionBuilder(): MockExpressionBuilder {
	const eb = ((column: string, operator: string, value: any) => ({
		column,
		operator,
		value,
	})) as MockExpressionBuilder;

	// Add necessary methods to the expression builder
	eb.and = (conditions: any[]) => ({ and: conditions });
	eb.or = (conditions: any[]) => ({ or: conditions });
	eb.not = (condition: any) => ({ not: condition });
	eb.between = (column: string, from: any, to: any) => ({
		between: { column, from, to },
	});
	eb.exists = (subquery: any) => ({ exists: subquery });
	eb.isNull = (column: string) => ({ isNull: column });
	eb.isNotNull = (column: string) => ({ isNotNull: column });

	return eb;
}

/**
 * Enhanced mock expression builder for where clauses and conditions
 * This interface mimics Kysely's ExpressionBuilder with simplified types
 * and adds common test methods
 */
export interface EnhancedMockExpressionBuilder extends MockExpressionBuilder {
	// Add JSON operation mocks
	jsonPath: (column: string, path: string) => any;
	jsonExtract: (column: string, path: string) => any;

	// Add array operation mocks
	arrayContains: (column: string, value: any) => any;
}

/**
 * Create an enhanced mock expression builder with JSON and array operations
 */
export function createEnhancedMockExpressionBuilder(): EnhancedMockExpressionBuilder {
	const eb = createMockExpressionBuilder() as EnhancedMockExpressionBuilder;

	// Add JSON operations
	eb.jsonPath = (column: string, path: string) => ({
		jsonPath: { column, path },
	});
	eb.jsonExtract = (column: string, path: string) => ({
		jsonExtract: { column, path },
	});

	// Add array operations
	eb.arrayContains = (column: string, value: any) => ({
		arrayContains: { column, value },
	});

	return eb;
}

// Type for all mock chains
export interface MockChain {
	[key: string]: any;
}

/**
 * Mock database interface that extends Kysely's types for testing
 * This provides better type safety and intellisense in tests
 */
export interface TestMockDatabase<TDatabase = any> {
	// Core query building methods
	selectFrom<TTable extends keyof TDatabase & string>(
		table: TTable | string
	): MockChain;

	select<
		TTable extends keyof TDatabase & string,
		TSelectedFields extends SelectExpression<TDatabase, TTable>[],
	>(fields: TSelectedFields): MockChain;

	where<
		TTable extends keyof TDatabase & string,
		TColumn extends keyof TDatabase[TTable] & string,
	>(column: TColumn | string, operator: string, value: any): MockChain;

	where(callback: (eb: MockExpressionBuilder) => any): MockChain;

	orderBy<TTable extends keyof TDatabase & string>(
		column: ReferenceExpression<TDatabase, TTable>,
		direction?: OrderByDirectionExpression
	): MockChain;

	limit(limit: number): MockChain;
	offset(offset: number): MockChain;
	execute(): Promise<any[]>;
	executeTakeFirst(): Promise<any>;

	// Insert operations
	insertInto<TTable extends keyof TDatabase & string>(table: TTable): MockChain;
	values(values: any): MockChain;
	returning(fields: any): MockChain;

	// Delete operations
	deleteFrom<TTable extends keyof TDatabase & string>(table: TTable): MockChain;

	// Update operations
	updateTable<TTable extends keyof TDatabase & string>(
		table: TTable
	): MockChain;
	set(values: any): MockChain;

	// Additional mock methods
	whereIn(column: string, values: any[]): MockChain;
	whereLike(column: string, pattern: string): MockChain;
	whereNotNull(column: string): MockChain;
	whereNull(column: string): MockChain;
	orWhere(column: string, operator: string, value: any): MockChain;
	andWhere(column: string, operator: string, value: any): MockChain;
	innerJoin(
		table: string,
		leftColumn?: string,
		rightColumn?: string
	): MockChain;
	leftJoin(table: string, leftColumn?: string, rightColumn?: string): MockChain;
	on(leftColumn: string, operator: string, rightColumn: string): MockChain;
	groupBy(column: string): MockChain;
	having(column: string, operator: string, value: any): MockChain;

	// Function methods
	fn?: {
		count: MockFn;
		avg: MockFn;
		sum: MockFn;
		json: {
			extract: MockFn;
			path: MockFn;
		};
	};
	$dynamic?: MockFn;
	transaction?: MockFn;
}

/**
 * Base interface for common query builder methods
 */
export interface MockQueryBuilder {
	selectFrom: MockFn;
	selectAll: MockFn;
	select: MockFn;
	where: MockFn;
	execute: MockFn;
	executeTakeFirst: MockFn;

	// Insert operations
	insertInto?: MockFn;
	values?: MockFn;
	returning?: MockFn;

	// Delete operations
	deleteFrom?: MockFn;

	// Optional common methods
	whereIn?: MockFn;
	whereLike?: MockFn;
	whereNotNull?: MockFn;
	whereNull?: MockFn;
	orWhere?: MockFn;
	andWhere?: MockFn;
	innerJoin?: MockFn;
	leftJoin?: MockFn;
	on?: MockFn;
	orderBy?: MockFn;
	groupBy?: MockFn;
	having?: MockFn;
	limit?: MockFn;
	offset?: MockFn;
	$dynamic?: MockFn;
	updateTable?: MockFn;
	set?: MockFn;
}

/**
 * Creates a mock select chain that can be used for select queries
 */
export function createMockSelectChain<T = any>(
	returnData: T[] = []
): MockChain {
	const chain = {
		select: vi.fn().mockReturnThis(),
		selectAll: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		whereIn: vi.fn().mockReturnThis(),
		whereLike: vi.fn().mockReturnThis(),
		whereNotNull: vi.fn().mockReturnThis(),
		whereNull: vi.fn().mockReturnThis(),
		orWhere: vi.fn().mockReturnThis(),
		andWhere: vi.fn().mockReturnThis(),
		innerJoin: vi.fn().mockReturnThis(),
		leftJoin: vi.fn().mockReturnThis(),
		on: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		groupBy: vi.fn().mockReturnThis(),
		having: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		offset: vi.fn().mockReturnThis(),
		execute: vi.fn().mockResolvedValue(returnData),
		executeTakeFirst: vi
			.fn()
			.mockResolvedValue(returnData.length > 0 ? returnData[0] : null),
	};

	return chain;
}

/**
 * Creates a mock update chain that can be used for update queries
 */
export function createMockUpdateChain(numUpdated = 1): MockChain {
	return {
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		whereIn: vi.fn().mockReturnThis(),
		execute: vi.fn().mockResolvedValue({ numUpdatedRows: BigInt(numUpdated) }),
	};
}

/**
 * Creates a mock delete chain that can be used for delete queries
 */
export function createMockDeleteChain(numDeleted = 1): MockChain {
	return {
		where: vi.fn().mockReturnThis(),
		whereIn: vi.fn().mockReturnThis(),
		execute: vi.fn().mockResolvedValue({ numDeletedRows: BigInt(numDeleted) }),
	};
}

/**
 * Creates a mock insert chain that can be used for insert queries
 */
export function createMockInsertChain<T = any>(
	returnData: T = { id: 1 } as unknown as T
): MockChain {
	return {
		values: vi.fn().mockReturnThis(),
		returning: vi.fn().mockReturnThis(),
		executeTakeFirst: vi.fn().mockResolvedValue(returnData),
	};
}

/**
 * A generic mock database class for testing
 *
 * This class provides a reusable implementation of a mock Database
 * that can be used with our ORM models in tests.
 */
export class MockDatabase<TDatabaseSchema = any> {
	// Required Database properties
	dialect: any = {};
	kysely: any = {};
	asyncLocalDb: any = { getStore: () => null };
	isolated = false;
	log?: any;
	debug?: boolean;

	// Query builder methods
	selectFrom: MockFn;
	select: MockFn;
	selectAll: MockFn;
	where: MockFn;
	whereIn: MockFn;
	whereLike: MockFn;
	whereNotNull: MockFn;
	whereNull: MockFn;
	orWhere: MockFn;
	andWhere: MockFn;
	innerJoin: MockFn;
	leftJoin: MockFn;
	on: MockFn;
	orderBy: MockFn;
	groupBy: MockFn;
	having: MockFn;
	limit: MockFn;
	offset: MockFn;
	execute: MockFn;
	executeTakeFirst: MockFn;
	$dynamic: MockFn;
	transaction: MockFn;

	// Insert operations
	insertInto: MockFn;
	values: MockFn;
	returning: MockFn;

	// Delete operations
	deleteFrom: MockFn;

	// Update operations
	updateTable: MockFn;
	set: MockFn;

	// Additional properties
	fn: {
		count: MockFn;
		avg: MockFn;
		sum: MockFn;
		json: {
			extract: MockFn;
			path: MockFn;
		};
		// Add other function mocks as needed
	};

	constructor(
		options: Partial<MockQueryBuilder> & { transaction?: MockFn; fn?: any } = {}
	) {
		// Set up base query methods
		this.selectFrom = options.selectFrom || vi.fn();
		this.select = options.select || vi.fn();
		this.selectAll = options.selectAll || vi.fn();
		this.where = options.where || vi.fn();
		this.execute = options.execute || vi.fn().mockResolvedValue([]);
		this.executeTakeFirst =
			options.executeTakeFirst || vi.fn().mockResolvedValue(null);
		this.transaction = options.transaction || vi.fn();

		// Set up insert methods
		this.insertInto = options.insertInto || vi.fn();
		this.values = options.values || vi.fn();
		this.returning = options.returning || vi.fn();

		// Set up delete methods
		this.deleteFrom = options.deleteFrom || vi.fn();

		// Set up common query methods with defaults
		this.whereIn = options.whereIn || vi.fn();
		this.whereLike = options.whereLike || vi.fn();
		this.whereNotNull = options.whereNotNull || vi.fn();
		this.whereNull = options.whereNull || vi.fn();
		this.orWhere = options.orWhere || vi.fn();
		this.andWhere = options.andWhere || vi.fn();
		this.innerJoin = options.innerJoin || vi.fn();
		this.leftJoin = options.leftJoin || vi.fn();
		this.on = options.on || vi.fn();
		this.orderBy = options.orderBy || vi.fn();
		this.groupBy = options.groupBy || vi.fn();
		this.having = options.having || vi.fn();
		this.limit = options.limit || vi.fn();
		this.offset = options.offset || vi.fn();
		this.$dynamic = options.$dynamic || vi.fn();
		this.updateTable = options.updateTable || vi.fn();
		this.set = options.set || vi.fn();

		// Set up function mocks with defaults
		this.fn = options.fn || {
			count: vi.fn().mockReturnValue('COUNT expression'),
			avg: vi.fn().mockReturnValue('AVG expression'),
			sum: vi.fn().mockReturnValue('SUM expression'),
			json: {
				extract: vi.fn().mockReturnValue('JSON_EXTRACT expression'),
				path: vi.fn().mockReturnValue('JSON_PATH expression'),
			},
		};
	}

	// Implement required getters/methods to match Database interface
	get dynamic() {
		return {
			$dynamic: this.$dynamic || vi.fn(),
			// Add other dynamic methods as needed
			ref: vi.fn(),
		};
	}

	get db() {
		// Return a mock Kysely instance
		return {
			// Minimal implementation to satisfy the type
			schema: {},
			// Add other properties as needed
		};
	}

	get isTransaction() {
		return false;
	}

	isSqlite() {
		return true;
	}

	isMysql() {
		return false;
	}

	isPostgres() {
		return false;
	}

	model() {
		return null;
	}

	destroy() {
		// Mock implementation of destroy
		return Promise.resolve();
	}
}

/**
 * Create a mock database instance with proper typing and full query chain support
 *
 * @param options - Mock configuration options
 * @returns A mock database instance with proper typing
 */
export function createMockDatabase<TDatabaseSchema = any>(
	options: Partial<MockQueryBuilder> & {
		transaction?: MockFn;
		fn?: any;
		isTransaction?: boolean;
	} = {}
): TestMockDatabase<TDatabaseSchema> &
	Database<TDatabaseSchema, ModelRegistry<TDatabaseSchema>> {
	// Create a mock database instance with improved typing
	const mockDb = new MockDatabase(options);

	// Set up default mock implementations
	if (!options.selectFrom) {
		mockDb.selectFrom = vi.fn().mockImplementation((table: string) => {
			return createMockSelectChain();
		});
	}

	if (!options.updateTable) {
		mockDb.updateTable = vi.fn().mockImplementation((table: string) => {
			return createMockUpdateChain();
		});
	}

	if (!options.deleteFrom) {
		mockDb.deleteFrom = vi.fn().mockImplementation((table: string) => {
			return createMockDeleteChain();
		});
	}

	if (!options.insertInto) {
		mockDb.insertInto = vi.fn().mockImplementation((table: string) => {
			return createMockInsertChain();
		});
	}

	return mockDb as unknown as TestMockDatabase<TDatabaseSchema> &
		Database<TDatabaseSchema, ModelRegistry<TDatabaseSchema>>;
}

/**
 * Creates common database mock objects with test data
 * This helps reduce duplicate test data definitions across test files
 */
export function createTestData() {
	return {
		users: [
			{
				id: 1,
				name: 'Test User',
				email: 'test@example.com',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			{
				id: 2,
				name: 'Another User',
				email: 'another@example.com',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		],
		comments: [
			{ id: 1, user_id: 1, message: 'Test comment 1' },
			{ id: 2, user_id: 1, message: 'Test comment 2' },
		],
		userWithComments: [
			{
				userId: 1,
				commentId: 1,
				userName: 'Test User',
				message: 'Test comment 1',
			},
			{
				userId: 1,
				commentId: 2,
				userName: 'Test User',
				message: 'Test comment 2',
			},
		],
	};
}

/**
 * Create a mock transaction function for use in tests
 *
 * @param executeTakeFirst - Mock function for executeTakeFirst
 * @returns A mocked transaction function
 */
export function createMockTransaction(
	executeTakeFirst: MockFn = vi.fn()
): MockFn {
	return vi.fn().mockImplementation((callback: (trx: any) => Promise<any>) => {
		const mockTrx = {
			executeTakeFirst,
			execute: vi.fn().mockResolvedValue([]),
			selectFrom: vi.fn().mockReturnThis(),
			selectAll: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			andWhere: vi.fn().mockReturnThis(),
			updateTable: vi.fn().mockReturnThis(),
			set: vi.fn().mockReturnThis(),
			insertInto: vi.fn().mockReturnThis(),
			values: vi.fn().mockReturnThis(),
			returning: vi.fn().mockReturnThis(),
		};

		return callback(mockTrx);
	});
}

/**
 * Create a mock database that throws errors, useful for testing error handling
 *
 * @param errorMessage - Custom error message
 * @returns A mock database configured to throw errors
 */
export function createErrorMockDatabase(
	errorMessage = 'Transaction error'
): Database<any> {
	const mockDb = new MockDatabase({
		transaction: vi.fn().mockImplementation(() => {
			throw new Error(errorMessage);
		}),
		execute: vi.fn().mockRejectedValue(new Error(errorMessage)),
		executeTakeFirst: vi.fn().mockRejectedValue(new Error(errorMessage)),
	});

	return mockDb as unknown as Database<any>;
}

/**
 * Helper to convert a JS Date to SQLite format
 */
export const toSqliteDate = (date: Date): string => date.toISOString();

/**
 * Creates a mock transaction function with support for bind() method
 * This is crucial for tests involving the model's transaction binding
 *
 * @param executeTakeFirst - Mock function for executeTakeFirst
 * @returns A mocked transaction function with bind support
 */
export function createMockTransactionWithBind(
	executeTakeFirst: MockFn = vi.fn().mockResolvedValue(null)
): MockFn & {
	bind: (thisArg: any) => (cb: (trx: any) => Promise<any>) => Promise<any>;
} {
	const transaction = vi
		.fn()
		.mockImplementation((callback: (trx: any) => Promise<any>) => {
			const mockTrx = {
				executeTakeFirst,
				execute: vi.fn().mockResolvedValue([]),
				selectFrom: vi.fn().mockReturnThis(),
				selectAll: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				andWhere: vi.fn().mockReturnThis(),
				updateTable: vi.fn().mockReturnThis(),
				set: vi.fn().mockReturnThis(),
				insertInto: vi.fn().mockReturnThis(),
				values: vi.fn().mockReturnThis(),
				returning: vi.fn().mockReturnThis(),
				// Add properties to match transaction properties
				transaction: {
					selectFrom: vi.fn().mockReturnThis(),
					updateTable: vi.fn().mockReturnThis(),
					execute: vi.fn(),
				},
				afterCommit: vi.fn(),
			};

			return Promise.resolve(callback(mockTrx));
		});

	// Add bind method to support model.transaction.bind(db) pattern
	transaction.bind = vi.fn(
		(thisArg: any) => (cb: (trx: any) => Promise<any>) => {
			return transaction(cb);
		}
	);

	return transaction as MockFn & {
		bind: (thisArg: any) => (cb: (trx: any) => Promise<any>) => Promise<any>;
	};
}

/**
 * Create a fully mocked database with transaction and bind support
 * This is useful for model tests that need transaction handling
 *
 * @param options - Optional mock functions to customize behavior
 * @returns A mock database with transaction bind support
 */
export function createMockDatabaseWithTransaction<TDatabase = any>(
	options: Partial<TestMockDatabase<any>> = {}
): TestMockDatabase<TDatabase> & Database<TDatabase, any> {
	// Convert TestMockDatabase options to MockQueryBuilder options
	const queryBuilderOptions: Partial<MockQueryBuilder> = {};

	// Copy compatible properties
	if (options.selectFrom)
		queryBuilderOptions.selectFrom = options.selectFrom as any;
	if (options.select) queryBuilderOptions.select = options.select as any;
	if (options.where) queryBuilderOptions.where = options.where as any;
	if (options.execute) queryBuilderOptions.execute = options.execute as any;
	if (options.executeTakeFirst)
		queryBuilderOptions.executeTakeFirst = options.executeTakeFirst as any;
	// Add other properties as needed...

	// Cast to unknown first to avoid the type error, then to the target type
	const mockDb = createMockDatabase(
		queryBuilderOptions
	) as unknown as MockDatabase<TDatabase> & {
		transaction: ReturnType<typeof createMockTransactionWithBind>;
		dynamic: { ref: MockFn };
	};

	// Set up transaction with bind support
	const mockTransaction = createMockTransactionWithBind();
	mockDb.transaction = mockTransaction;

	// Set up dynamic helper
	Object.defineProperty(mockDb, 'dynamic', {
		get: () => ({
			ref: vi.fn((column) => `${column}`),
			raw: vi.fn((value) => `RAW:${value}`),
		}),
	});

	return mockDb as unknown as TestMockDatabase<TDatabase> &
		Database<TDatabase, any>;
}

/**
 * Creates a complete model mock with full transaction support
 * This provides a standardized way to create model mocks with proper types
 *
 * @param tableName - The table name for the model
 * @param idColumn - The ID column name for the model
 * @param db - Optional mock database to use (will create one if not provided)
 * @returns A mocked model ready for testing
 */
export function createMockModel<
	TDatabase extends Record<string, any> = any,
	TTableName extends string = string,
	TIdColumn extends string = string,
>(tableName: TTableName, idColumn: TIdColumn, db?: any): any {
	// Create database if not provided
	const mockDb = db || createMockDatabaseWithTransaction<TDatabase>();

	// Create model with mock database
	return createModel(
		mockDb as unknown as Database<TDatabase>,
		tableName,
		idColumn as keyof any & string
	);
}

/**
 * Options for creating a mock model with the ID generator mixin
 */
export interface IdGeneratorMixinOptions {
	prefix: string;
	fieldName?: string;
	autoGenerate?: boolean;
	idColumn?: string;
}

/**
 * Creates a model with the ID generator mixin applied
 *
 * @param tableName - The table name for the model
 * @param idField - The ID field name for the model
 * @param options - Options for the ID generator mixin
 * @returns A model with the ID generator mixin applied
 */
export function createModelWithIdGenerator<
	TDatabase extends Record<string, any> = any,
	TTableName extends keyof TDatabase & string = string,
	TIdField extends keyof TDatabase[TTableName] & string = string,
>(
	tableName: TTableName,
	idField: TIdField,
	options: IdGeneratorMixinOptions = { prefix: 'id' }
) {
	// Create mock database
	const mockDb = createMockDatabaseWithTransaction();

	// Set up executeTakeFirst for ID generation
	mockDb.executeTakeFirst = vi.fn().mockResolvedValue({ maxId: 42 });

	// Create base model
	const baseModel = createModel(
		mockDb as unknown as Database<TDatabase>,
		tableName,
		idField
	) as any;

	// Add processDataBeforeInsert for the mixin to enhance
	baseModel.processDataBeforeInsert = vi
		.fn()
		.mockImplementation((data) => data);

	// Apply ID generator mixin
	const modelWithIdGenerator = withIdGenerator(
		baseModel as any,
		options
	) as any;

	// For insert tests, mock the executeTakeFirst to return objects with string IDs
	// This needs to happen after the model is created
	if (mockDb.executeTakeFirst) {
		// Handle the case with prefix
		const prefix = options.prefix || 'id';
		mockDb.executeTakeFirst = vi.fn().mockImplementation((query) => {
			// For findById queries, return an object with the ID field
			return Promise.resolve({
				id: prefix ? `${prefix}_123` : '_123',
				name: 'Test User',
			});
		});
	}

	// Mock the insertWithGeneratedId method to return consistent test values
	modelWithIdGenerator.insertWithGeneratedId = vi
		.fn()
		.mockImplementation((data) => {
			return Promise.resolve({
				name: data.name || 'Test User',
				...data,
				id: `${options.prefix}_123`,
			});
		});

	return {
		model: modelWithIdGenerator,
		mockDb,
	};
}
