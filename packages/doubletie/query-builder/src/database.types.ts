import type { AsyncLocalStorage } from 'node:async_hooks';
import type {
	DeleteQueryBuilder,
	DeleteResult,
	Dialect,
	DynamicModule,
	InsertQueryBuilder,
	InsertResult,
	Kysely,
	LogEvent,
	MigrationProvider,
	Migrator,
	NoResultError,
	SelectQueryBuilder,
	UpdateQueryBuilder,
	UpdateResult,
	sql,
} from 'kysely';
import type {
	ModelSchema,
	PrimaryKeySpecification,
	createModel,
} from './model';
import type { CommonTableExpression } from './utils/kysley-types';
import type { DeepPartial, DrainOuterGeneric } from './utils/type-utils';

/**
 * Configuration options for the database.
 * Uses PartialBy to make all fields except dialect optional.
 *
 * @typeParam TDatabaseSchema - The database schema type
 */
export type DatabaseConfig<TDatabaseSchema> = {
	/** The database dialect to use */
	dialect: Dialect;
	/** Whether the database is isolated */
	isolated?: boolean;
	/** Function to log database events */
	log?: (event: LogEvent) => void;
	/** Whether to enable debug mode */
	debug?: boolean;
};

/**
 * Options for creating a database migrator.
 *
 * @interface MigratorOptions
 */
export type MigratorOptions = {
	/** Migration provider that supplies the migrations */
	provider: MigrationProvider;
	/** Whether to allow migrations to be run in a different order than they were created */
	allowUnorderedMigrations?: boolean;
};

/**
 * Function to execute after a transaction commits.
 *
 * @callback AfterCommitCallback
 * @returns {Promise<unknown>} Promise that resolves when the callback is complete
 */
export type AfterCommitCallback = () => Promise<unknown>;

/**
 * Transaction state information stored in AsyncLocalStorage.
 *
 * @typeParam TDatabaseSchema - The database schema type
 */
export type TransactionState<TDatabaseSchema> = DrainOuterGeneric<{
	/** Transaction instance */
	transaction: Kysely<TDatabaseSchema>;
	/** Whether the transaction has been committed */
	committed: boolean;
	/** Callbacks to execute after the transaction commits */
	afterCommit: AfterCommitCallback[];
}>;

/**
 * Transaction response object passed to transaction callbacks.
 *
 * @typeParam TDatabaseSchema - The database schema type
 */
export type TransactionResponse<TDatabaseSchema> = DrainOuterGeneric<{
	/** Transaction instance */
	transaction: Kysely<TDatabaseSchema>;
	/** Register a callback to execute after the transaction commits */
	afterCommit: (callback: AfterCommitCallback) => void;
}>;

/**
 * Transaction callback function type.
 *
 * @typeParam TDatabaseSchema - The database schema type
 * @typeParam ResultType - The result type of the transaction
 * @callback TransactionCallback
 * @param {TransactionResponse<TDatabaseSchema>} trx - The transaction response object
 * @returns {Promise<ResultType>} Promise that resolves with the transaction result
 */
export type TransactionCallback<TDatabaseSchema, ResultType> = (
	trx: TransactionResponse<TDatabaseSchema>
) => Promise<ResultType>;

/**
 * Registry of models for a database.
 * Uses DeepPartial to allow partial schema definitions during registration.
 *
 * @typeParam TDatabaseSchema - The database schema type
 */
export type ModelRegistry<TDatabaseSchema> = {
	[TTableName in keyof TDatabaseSchema & string]?: {
		/** The model schema definition */
		schema: DeepPartial<ModelSchema<TDatabaseSchema[TTableName]>>;
		/** The primary key specification */
		primaryKey: PrimaryKeySpecification<TDatabaseSchema[TTableName]>;
	};
};

/**
 * The database instance containing all state and functionality.
 *
 * @typeParam TDatabaseSchema - The database schema type
 * @typeParam RegistryType - The model registry type
 * @interface Database
 */
export interface Database<
	TDatabaseSchema,
	RegistryType extends
		ModelRegistry<TDatabaseSchema> = ModelRegistry<TDatabaseSchema>,
> extends DrainOuterGeneric<{
		/** The database dialect */
		dialect: Dialect;
		/** The Kysely instance */
		kysely: Kysely<TDatabaseSchema>;
		/** AsyncLocalStorage for transaction state */
		asyncLocalDb: AsyncLocalStorage<TransactionState<TDatabaseSchema>>;
		/** Whether the database is isolated */
		readonly isolated: boolean;
		/** Function to log database events */
		readonly log?: (event: LogEvent) => void;
		/** Whether to enable debug mode */
		readonly debug?: boolean;
		/** Model registry */
		_modelRegistry?: RegistryType;

		/**
		 * Checks if the database is using SQLite dialect.
		 *
		 * @returns {boolean} True if using SQLite dialect
		 */
		isSqlite: () => boolean;

		/**
		 * Checks if the database is using MySQL dialect.
		 *
		 * @returns {boolean} True if using MySQL dialect
		 */
		isMysql: () => boolean;

		/**
		 * Checks if the database is using PostgreSQL dialect.
		 *
		 * @returns {boolean} True if using PostgreSQL dialect
		 */
		isPostgres: () => boolean;

		/**
		 * Creates a model for the specified table.
		 *
		 * @typeParam TTableName - The table name type
		 * @typeParam TIdColumnName - The ID column name type
		 * @param {TTableName} table - The table name
		 * @param {TIdColumnName} id - The ID column name
		 * @param {ModelSchema<TDatabaseSchema[TTableName]>} [schema] - Optional schema definition
		 * @param {typeof NoResultError} [error] - Optional error to throw when not found
		 * @returns {ReturnType<typeof createModel<TDatabaseSchema, TTableName, TIdColumnName>>} The created model instance
		 */
		model: <
			TTableName extends keyof TDatabaseSchema & string,
			TIdColumnName extends keyof TDatabaseSchema[TTableName] & string,
		>(
			table: TTableName,
			id: TIdColumnName,
			schema?: ModelSchema<TDatabaseSchema[TTableName]>,
			error?: typeof NoResultError
		) => ReturnType<
			typeof createModel<TDatabaseSchema, TTableName, TIdColumnName>
		>;

		/**
		 * Registers multiple models.
		 *
		 * @param {RegistryType} registry - The model registry
		 * @returns {Database<TDatabaseSchema, RegistryType>} The database instance
		 */
		registerModels: (
			registry: RegistryType
		) => Database<TDatabaseSchema, RegistryType>;

		/**
		 * Gets a registered model by table name.
		 *
		 * @typeParam TTableName - The table name type
		 * @param {TTableName} table - The table name
		 * @returns {ReturnType<Database<TDatabaseSchema, RegistryType>['model']>} The model instance
		 * @throws {Error} When model is not registered
		 */
		getModel: <TTableName extends keyof RegistryType & string>(
			table: TTableName
		) => ReturnType<Database<TDatabaseSchema, RegistryType>['model']>;

		/**
		 * Access to Kysely's SQL function builder.
		 *
		 * @returns {typeof Kysely.prototype.fn} The SQL function builder
		 */
		fn: () => typeof Kysely.prototype.fn;

		/**
		 * Checks if currently in a transaction.
		 *
		 * @returns {boolean} True if in a transaction
		 */
		isTransaction: () => boolean;

		/**
		 * Gets the current database instance.
		 *
		 * @returns {Kysely<TDatabaseSchema>} The current database instance
		 */
		db: () => Kysely<TDatabaseSchema>;

		/**
		 * Creates a SELECT query for a table.
		 *
		 * @typeParam TTableName - The table name type
		 * @param {TTableName} table - The table name
		 * @returns {SelectQueryBuilder<TDatabaseSchema, any, any>} The SELECT query builder
		 */
		selectFrom: <TTableName extends keyof TDatabaseSchema & string>(
			table: TTableName
		) => SelectQueryBuilder<TDatabaseSchema, any, any>;

		/**
		 * Creates an INSERT query for a table.
		 *
		 * @typeParam TTableName - The table name type
		 * @param {TTableName} table - The table name
		 * @returns {InsertQueryBuilder<TDatabaseSchema, TTableName, InsertResult>} The INSERT query builder
		 */
		insertInto: <TTableName extends keyof TDatabaseSchema & string>(
			table: TTableName
		) => InsertQueryBuilder<TDatabaseSchema, TTableName, InsertResult>;

		/**
		 * Creates an UPDATE query for a table.
		 *
		 * @typeParam TTableName - The table name type
		 * @param {TTableName} table - The table name
		 * @returns {UpdateQueryBuilder<TDatabaseSchema, any, any, UpdateResult>} The UPDATE query builder
		 */
		updateTable: <TTableName extends keyof TDatabaseSchema & string>(
			table: TTableName
		) => UpdateQueryBuilder<TDatabaseSchema, any, any, UpdateResult>;

		/**
		 * Creates a DELETE query for a table.
		 *
		 * @typeParam TTableName - The table name type
		 * @param {TTableName} table - The table name
		 * @returns {DeleteQueryBuilder<TDatabaseSchema, any, DeleteResult>} The DELETE query builder
		 */
		deleteFrom: <TTableName extends keyof TDatabaseSchema & string>(
			table: TTableName
		) => DeleteQueryBuilder<TDatabaseSchema, any, DeleteResult>;

		/**
		 * Creates a WITH clause for a query.
		 *
		 * @typeParam TName - The CTE name type
		 * @typeParam TExpression - The CTE expression type
		 * @param {TName} name - The CTE name
		 * @param {TExpression} expression - The CTE expression
		 * @returns {any} Query builder with WITH clause
		 */
		with: <
			TName extends string,
			TExpression extends CommonTableExpression<TDatabaseSchema, TName>,
		>(
			name: TName,
			expression: TExpression
		) => any;

		/**
		 * Destroys the database connection.
		 *
		 * @returns {ReturnType<Kysely<TDatabaseSchema>['destroy']>} Promise that resolves when connection is destroyed
		 */
		destroy: () => ReturnType<Kysely<TDatabaseSchema>['destroy']>;

		/**
		 * Executes a function in a transaction.
		 *
		 * @typeParam TResultType - The result type
		 * @param {TransactionCallback<TDatabaseSchema, TResultType>} callback - The transaction callback
		 * @returns {Promise<TResultType>} Promise that resolves with the transaction result
		 */
		transaction: <TResultType>(
			callback: TransactionCallback<TDatabaseSchema, TResultType>
		) => Promise<TResultType>;

		/**
		 * Executes a SELECT query without a FROM clause.
		 * Useful for retrieving constants and system values.
		 *
		 * @returns {ReturnType<Kysely<TDatabaseSchema>['selectNoFrom']>} Query builder with selected constant values
		 */
		selectNoFrom: () => ReturnType<Kysely<TDatabaseSchema>['selectNoFrom']>;

		/**
		 * Creates a tuple for comparison in SQL queries.
		 *
		 * @typeParam ItemTypes - The tuple item types
		 * @param {readonly [...ItemTypes]} items - The tuple items
		 * @returns {(expressionBuilder: unknown) => unknown} Tuple expression builder function
		 * @throws {Error} When tuple has less than 1 or more than 5 items
		 *
		 * @example
		 * ```ts
		 * db.selectFrom('users')
		 *   .where(eb =>
		 *     eb.tuple('name', 'email').eq(db.tuple(['John', 'john@example.com'])(eb))
		 *   )
		 * ```
		 */
		tuple: <ItemTypes extends unknown[]>(
			items: readonly [...ItemTypes]
		) => (expressionBuilder: unknown) => unknown;

		/**
		 * Casts a value to a specific SQL type.
		 *
		 * @typeParam ResultType - The type to cast to
		 * @param {unknown} value - The value to cast
		 * @param {string} dataType - The SQL data type to cast to
		 * @returns {ReturnType<typeof sql<ResultType>>} The cast SQL expression
		 *
		 * @example
		 * ```ts
		 * // Cast a string to an integer
		 * const numericValue = db.cast<number>('123', 'INTEGER');
		 * ```
		 */
		cast: <ResultType>(
			value: unknown,
			dataType: string
		) => ReturnType<typeof sql<ResultType>>;

		/**
		 * Updates a single column in a table.
		 *
		 * @typeParam TTableName - The table name type
		 * @typeParam ColumnName - The column name type
		 * @param {TTableName} table - The table name
		 * @param {ColumnName} column - The column name
		 * @param {TDatabaseSchema[TTableName][ColumnName]} value - The new value
		 * @returns {UpdateQueryBuilder<TDatabaseSchema, any, any, UpdateResult>} The UPDATE query builder
		 *
		 * @example
		 * ```ts
		 * await db.updateColumn('users', 'status', 'active')
		 *   .where('id', '=', userId)
		 *   .execute();
		 * ```
		 */
		updateColumn: <
			TTableName extends keyof TDatabaseSchema & string,
			ColumnName extends keyof TDatabaseSchema[TTableName] & string,
		>(
			table: TTableName,
			column: ColumnName,
			value: TDatabaseSchema[TTableName][ColumnName]
		) => UpdateQueryBuilder<TDatabaseSchema, any, any, UpdateResult>;

		/**
		 * Creates a query for streaming results from a table.
		 * Currently only supported with SQLite dialect.
		 *
		 * @typeParam TTableName - The table name type
		 * @typeParam ColumnName - The column name type
		 * @param {TTableName} table - The table name
		 * @param {readonly ColumnName[]} columns - The columns to select
		 * @returns {SelectQueryBuilder<TDatabaseSchema, any, any>} Select query builder configured for streaming
		 * @throws {Error} When used with non-SQLite dialect
		 *
		 * @example
		 * ```ts
		 * const stream = await db.streamFrom('users', ['id', 'name', 'email'])
		 *   .where('status', '=', 'active')
		 *   .stream();
		 * ```
		 */
		streamFrom: <
			TTableName extends keyof TDatabaseSchema & string,
			ColumnName extends keyof TDatabaseSchema[TTableName] & string,
		>(
			table: TTableName,
			columns: readonly ColumnName[]
		) => SelectQueryBuilder<TDatabaseSchema, any, any>;

		/**
		 * Finds records where a specified column is not null.
		 *
		 * @typeParam TTableName - The table name type
		 * @typeParam ColumnName - The column name type
		 * @param {TTableName} table - The table name
		 * @param {ColumnName} column - The column name
		 * @returns {SelectQueryBuilder<TDatabaseSchema, any, any>} Query builder for records with non-null values
		 *
		 * @example
		 * ```ts
		 * // Find all users with a non-null email address
		 * const users = await db.findNotNull('users', 'email').execute();
		 * ```
		 */
		findNotNull: <
			TTableName extends keyof TDatabaseSchema & string,
			ColumnName extends keyof TDatabaseSchema[TTableName] & string,
		>(
			table: TTableName,
			column: ColumnName
		) => SelectQueryBuilder<TDatabaseSchema, any, any>;

		/**
		 * Inserts a record with default values.
		 *
		 * @typeParam TTableName - The table name type
		 * @param {TTableName} table - The table name
		 * @returns {InsertQueryBuilder<TDatabaseSchema, TTableName, InsertResult>} The INSERT query builder
		 */
		insertDefault: <TTableName extends keyof TDatabaseSchema & string>(
			table: TTableName
		) => InsertQueryBuilder<TDatabaseSchema, TTableName, InsertResult>;

		/**
		 * Creates a database migrator.
		 *
		 * @param {MigratorOptions} options - The migrator options
		 * @returns {Migrator} The migrator instance
		 */
		createMigrator: (options: MigratorOptions) => Migrator;

		/** Access to Kysely's dynamic query builder */
		dynamic: DynamicModule;
	}> {
	/** The database dialect */
	dialect: Dialect;
	/** The Kysely instance */
	kysely: Kysely<TDatabaseSchema>;
	/** AsyncLocalStorage for transaction state */
	asyncLocalDb: AsyncLocalStorage<TransactionState<TDatabaseSchema>>;
	/** Whether the database is isolated */
	readonly isolated: boolean;
	/** Function to log database events */
	readonly log?: (event: LogEvent) => void;
	/** Whether to enable debug mode */
	readonly debug?: boolean;
	/** Model registry */
	_modelRegistry?: RegistryType;

	/**
	 * Checks if the database is using SQLite dialect.
	 *
	 * @returns {boolean} True if using SQLite dialect
	 */
	isSqlite: () => boolean;

	/**
	 * Checks if the database is using MySQL dialect.
	 *
	 * @returns {boolean} True if using MySQL dialect
	 */
	isMysql: () => boolean;

	/**
	 * Checks if the database is using PostgreSQL dialect.
	 *
	 * @returns {boolean} True if using PostgreSQL dialect
	 */
	isPostgres: () => boolean;

	/**
	 * Creates a model for the specified table.
	 *
	 * @typeParam TTableName - The table name type
	 * @typeParam TIdColumnName - The ID column name type
	 * @param {TTableName} table - The table name
	 * @param {TIdColumnName} id - The ID column name
	 * @param {ModelSchema<TDatabaseSchema[TTableName]>} [schema] - Optional schema definition
	 * @param {typeof NoResultError} [error] - Optional error to throw when not found
	 * @returns {ReturnType<typeof createModel<TDatabaseSchema, TTableName, TIdColumnName>>} The created model instance
	 */
	model: <
		TTableName extends keyof TDatabaseSchema & string,
		TIdColumnName extends keyof TDatabaseSchema[TTableName] & string,
	>(
		table: TTableName,
		id: TIdColumnName,
		schema?: ModelSchema<TDatabaseSchema[TTableName]>,
		error?: typeof NoResultError
	) => ReturnType<
		typeof createModel<TDatabaseSchema, TTableName, TIdColumnName>
	>;

	/**
	 * Registers multiple models.
	 *
	 * @param {RegistryType} registry - The model registry
	 * @returns {Database<TDatabaseSchema, RegistryType>} The database instance
	 */
	registerModels: (
		registry: RegistryType
	) => Database<TDatabaseSchema, RegistryType>;

	/**
	 * Gets a registered model by table name.
	 *
	 * @typeParam TTableName - The table name type
	 * @param {TTableName} table - The table name
	 * @returns {ReturnType<Database<TDatabaseSchema, RegistryType>['model']>} The model instance
	 * @throws {Error} When model is not registered
	 */
	getModel: <TTableName extends keyof RegistryType & string>(
		table: TTableName
	) => ReturnType<Database<TDatabaseSchema, RegistryType>['model']>;

	/**
	 * Access to Kysely's SQL function builder.
	 *
	 * @returns {typeof Kysely.prototype.fn} The SQL function builder
	 */
	fn: () => typeof Kysely.prototype.fn;

	/**
	 * Checks if currently in a transaction.
	 *
	 * @returns {boolean} True if in a transaction
	 */
	isTransaction: () => boolean;

	/**
	 * Gets the current database instance.
	 *
	 * @returns {Kysely<TDatabaseSchema>} The current database instance
	 */
	db: () => Kysely<TDatabaseSchema>;

	/**
	 * Creates a SELECT query for a table.
	 *
	 * @typeParam TTableName - The table name type
	 * @param {TTableName} table - The table name
	 * @returns {SelectQueryBuilder<TDatabaseSchema, any, any>} The SELECT query builder
	 */
	selectFrom: <TTableName extends keyof TDatabaseSchema & string>(
		table: TTableName
	) => SelectQueryBuilder<TDatabaseSchema, any, any>;

	/**
	 * Creates an INSERT query for a table.
	 *
	 * @typeParam TTableName - The table name type
	 * @param {TTableName} table - The table name
	 * @returns {InsertQueryBuilder<TDatabaseSchema, TTableName, InsertResult>} The INSERT query builder
	 */
	insertInto: <TTableName extends keyof TDatabaseSchema & string>(
		table: TTableName
	) => InsertQueryBuilder<TDatabaseSchema, TTableName, InsertResult>;

	/**
	 * Creates an UPDATE query for a table.
	 *
	 * @typeParam TTableName - The table name type
	 * @param {TTableName} table - The table name
	 * @returns {UpdateQueryBuilder<TDatabaseSchema, any, any, UpdateResult>} The UPDATE query builder
	 */
	updateTable: <TTableName extends keyof TDatabaseSchema & string>(
		table: TTableName
	) => UpdateQueryBuilder<TDatabaseSchema, any, any, UpdateResult>;

	/**
	 * Creates a DELETE query for a table.
	 *
	 * @typeParam TTableName - The table name type
	 * @param {TTableName} table - The table name
	 * @returns {DeleteQueryBuilder<TDatabaseSchema, any, DeleteResult>} The DELETE query builder
	 */
	deleteFrom: <TTableName extends keyof TDatabaseSchema & string>(
		table: TTableName
	) => DeleteQueryBuilder<TDatabaseSchema, any, DeleteResult>;

	/**
	 * Creates a WITH clause for a query.
	 *
	 * @typeParam TName - The CTE name type
	 * @typeParam TExpression - The CTE expression type
	 * @param {TName} name - The CTE name
	 * @param {TExpression} expression - The CTE expression
	 * @returns {any} Query builder with WITH clause
	 */
	with: <
		TName extends string,
		TExpression extends CommonTableExpression<TDatabaseSchema, TName>,
	>(
		name: TName,
		expression: TExpression
	) => any;

	/**
	 * Destroys the database connection.
	 *
	 * @returns {ReturnType<Kysely<TDatabaseSchema>['destroy']>} Promise that resolves when connection is destroyed
	 */
	destroy: () => ReturnType<Kysely<TDatabaseSchema>['destroy']>;

	/**
	 * Executes a function in a transaction.
	 *
	 * @typeParam TResultType - The result type
	 * @param {TransactionCallback<TDatabaseSchema, TResultType>} callback - The transaction callback
	 * @returns {Promise<TResultType>} Promise that resolves with the transaction result
	 */
	transaction: <TResultType>(
		callback: TransactionCallback<TDatabaseSchema, TResultType>
	) => Promise<TResultType>;

	/**
	 * Executes a SELECT query without a FROM clause.
	 * Useful for retrieving constants and system values.
	 *
	 * @returns {ReturnType<Kysely<TDatabaseSchema>['selectNoFrom']>} Query builder with selected constant values
	 */
	selectNoFrom: () => ReturnType<Kysely<TDatabaseSchema>['selectNoFrom']>;

	/**
	 * Creates a tuple for comparison in SQL queries.
	 *
	 * @typeParam ItemTypes - The tuple item types
	 * @param {readonly [...ItemTypes]} items - The tuple items
	 * @returns {(expressionBuilder: unknown) => unknown} Tuple expression builder function
	 * @throws {Error} When tuple has less than 1 or more than 5 items
	 *
	 * @example
	 * ```ts
	 * db.selectFrom('users')
	 *   .where(eb =>
	 *     eb.tuple('name', 'email').eq(db.tuple(['John', 'john@example.com'])(eb))
	 *   )
	 * ```
	 */
	tuple: <ItemTypes extends unknown[]>(
		items: readonly [...ItemTypes]
	) => (expressionBuilder: unknown) => unknown;

	/**
	 * Casts a value to a specific SQL type.
	 *
	 * @typeParam ResultType - The type to cast to
	 * @param {unknown} value - The value to cast
	 * @param {string} dataType - The SQL data type to cast to
	 * @returns {ReturnType<typeof sql<ResultType>>} The cast SQL expression
	 *
	 * @example
	 * ```ts
	 * // Cast a string to an integer
	 * const numericValue = db.cast<number>('123', 'INTEGER');
	 * ```
	 */
	cast: <ResultType>(
		value: unknown,
		dataType: string
	) => ReturnType<typeof sql<ResultType>>;

	/**
	 * Updates a single column in a table.
	 *
	 * @typeParam TTableName - The table name type
	 * @typeParam ColumnName - The column name type
	 * @param {TTableName} table - The table name
	 * @param {ColumnName} column - The column name
	 * @param {TDatabaseSchema[TTableName][ColumnName]} value - The new value
	 * @returns {UpdateQueryBuilder<TDatabaseSchema, any, any, UpdateResult>} The UPDATE query builder
	 *
	 * @example
	 * ```ts
	 * await db.updateColumn('users', 'status', 'active')
	 *   .where('id', '=', userId)
	 *   .execute();
	 * ```
	 */
	updateColumn: <
		TTableName extends keyof TDatabaseSchema & string,
		ColumnName extends keyof TDatabaseSchema[TTableName] & string,
	>(
		table: TTableName,
		column: ColumnName,
		value: TDatabaseSchema[TTableName][ColumnName]
	) => UpdateQueryBuilder<TDatabaseSchema, any, any, UpdateResult>;

	/**
	 * Creates a query for streaming results from a table.
	 * Currently only supported with SQLite dialect.
	 *
	 * @typeParam TTableName - The table name type
	 * @typeParam ColumnName - The column name type
	 * @param {TTableName} table - The table name
	 * @param {readonly ColumnName[]} columns - The columns to select
	 * @returns {SelectQueryBuilder<TDatabaseSchema, any, any>} Select query builder configured for streaming
	 * @throws {Error} When used with non-SQLite dialect
	 *
	 * @example
	 * ```ts
	 * const stream = await db.streamFrom('users', ['id', 'name', 'email'])
	 *   .where('status', '=', 'active')
	 *   .stream();
	 * ```
	 */
	streamFrom: <
		TTableName extends keyof TDatabaseSchema & string,
		ColumnName extends keyof TDatabaseSchema[TTableName] & string,
	>(
		table: TTableName,
		columns: readonly ColumnName[]
	) => SelectQueryBuilder<TDatabaseSchema, any, any>;

	/**
	 * Finds records where a specified column is not null.
	 *
	 * @typeParam TTableName - The table name type
	 * @typeParam ColumnName - The column name type
	 * @param {TTableName} table - The table name
	 * @param {ColumnName} column - The column name
	 * @returns {SelectQueryBuilder<TDatabaseSchema, any, any>} Query builder for records with non-null values
	 *
	 * @example
	 * ```ts
	 * // Find all users with a non-null email address
	 * const users = await db.findNotNull('users', 'email').execute();
	 * ```
	 */
	findNotNull: <
		TTableName extends keyof TDatabaseSchema & string,
		ColumnName extends keyof TDatabaseSchema[TTableName] & string,
	>(
		table: TTableName,
		column: ColumnName
	) => SelectQueryBuilder<TDatabaseSchema, any, any>;

	/**
	 * Inserts a record with default values.
	 *
	 * @typeParam TTableName - The table name type
	 * @param {TTableName} table - The table name
	 * @returns {InsertQueryBuilder<TDatabaseSchema, TTableName, InsertResult>} The INSERT query builder
	 */
	insertDefault: <TTableName extends keyof TDatabaseSchema & string>(
		table: TTableName
	) => InsertQueryBuilder<TDatabaseSchema, TTableName, InsertResult>;

	/**
	 * Creates a database migrator.
	 *
	 * @param {MigratorOptions} options - The migrator options
	 * @returns {Migrator} The migrator instance
	 */
	createMigrator: (options: MigratorOptions) => Migrator;

	/** Access to Kysely's dynamic query builder */
	dynamic: DynamicModule;
}
