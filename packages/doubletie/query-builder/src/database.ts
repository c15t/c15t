/**
 * Functional Database wrapper for Kysely
 * @module database
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import {
	CamelCasePlugin,
	Kysely,
	Migrator,
	MysqlDialect,
	type NoResultError,
	PostgresDialect,
	SqliteDialect,
	sql,
} from 'kysely';
import type {
	Database,
	DatabaseConfig,
	MigratorOptions,
	ModelRegistry,
	TransactionCallback,
	TransactionState,
} from './database.types';
import { type ModelSchema, createModel } from './model';
import type { CommonTableExpression } from './utils/kysley-types';

/**
 * Creates a new Database instance.
 *
 * @typeParam TDatabaseSchema - The database schema type
 * @typeParam RegistryType - The model registry type
 * @param {DatabaseConfig<TDatabaseSchema>} config - The database configuration
 * @returns {Database<TDatabaseSchema, RegistryType>} A new database instance
 */
export function createDatabase<
	TDatabaseSchema,
	RegistryType extends
		ModelRegistry<TDatabaseSchema> = ModelRegistry<TDatabaseSchema>,
>(
	config: DatabaseConfig<TDatabaseSchema>
): Database<TDatabaseSchema, RegistryType> {
	const dialect = config.dialect;
	const isolated = config.isolated ?? false;
	const log = config.log;
	const debug = config.debug;

	const kysely = new Kysely<TDatabaseSchema>({
		dialect,
		log,
		plugins: [new CamelCasePlugin()],
	});

	const asyncLocalDb = new AsyncLocalStorage<
		TransactionState<TDatabaseSchema>
	>();

	const db: Database<TDatabaseSchema, RegistryType> = {
		dialect,
		kysely,
		asyncLocalDb,
		isolated,
		log,
		debug,

		isSqlite: () => {
			return dialect instanceof SqliteDialect;
		},

		isMysql: () => {
			return dialect instanceof MysqlDialect;
		},

		isPostgres: () => {
			return dialect instanceof PostgresDialect;
		},

		model: <
			TTableName extends keyof TDatabaseSchema & string,
			TIdColumnName extends keyof TDatabaseSchema[TTableName] & string,
		>(
			table: TTableName,
			id: TIdColumnName,
			schema?: ModelSchema<TDatabaseSchema[TTableName]>,
			error?: typeof NoResultError
		) => {
			return createModel<TDatabaseSchema, TTableName, TIdColumnName>(
				db as unknown as any, // Cast to avoid circular typing issues
				table,
				id,
				schema,
				error
			);
		},

		registerModels: (registry: RegistryType) => {
			db._modelRegistry = registry;
			return db;
		},

		getModel: <TTableName extends keyof RegistryType & string>(
			table: TTableName
		) => {
			const registry = db._modelRegistry;
			if (!registry || !registry[table]) {
				throw new Error(`Model for table "${String(table)}" is not registered`);
			}

			const modelDef = registry[table]!;
			const tableKey = table as unknown as keyof TDatabaseSchema & string;
			const idField = modelDef.primaryKey
				.field as unknown as keyof TDatabaseSchema[typeof tableKey] & string;
			const schema = modelDef.schema as unknown as ModelSchema<
				TDatabaseSchema[typeof tableKey]
			>;

			return db.model(tableKey, idField, schema);
		},

		fn: () => {
			return kysely.fn;
		},

		isTransaction: () => {
			return !!asyncLocalDb.getStore();
		},

		db: () => {
			const state = asyncLocalDb.getStore();
			if (!state) {
				return kysely;
			}

			return state.transaction;
		},

		selectFrom: <TTableName extends keyof TDatabaseSchema & string>(
			table: TTableName
		) => {
			return kysely.selectFrom(table);
		},

		insertInto: <TTableName extends keyof TDatabaseSchema & string>(
			table: TTableName
		) => {
			return kysely.insertInto(table);
		},

		updateTable: <TTableName extends keyof TDatabaseSchema & string>(
			table: TTableName
		) => {
			return kysely.updateTable(table);
		},

		deleteFrom: <TTableName extends keyof TDatabaseSchema & string>(
			table: TTableName
		) => {
			return kysely.deleteFrom(table);
		},

		with: <
			TName extends string,
			TExpression extends CommonTableExpression<TDatabaseSchema, TName>,
		>(
			name: TName,
			expression: TExpression
		) => {
			return kysely.with(name, expression);
		},

		destroy: () => {
			return kysely.destroy();
		},

		dynamic: kysely.dynamic,

		transaction: async <TResultType>(
			callback: TransactionCallback<TDatabaseSchema, TResultType>
		): Promise<TResultType> => {
			if (asyncLocalDb.getStore()) {
				// Already in a transaction, use the existing one
				return callback({
					transaction: db.db(),
					afterCommit: (callback) => {
						const state = asyncLocalDb.getStore();
						if (!state) {
							throw new Error('No transaction state found');
						}
						state.afterCommit.push(callback);
					},
				});
			}

			return kysely.transaction().execute(async (trx) => {
				const state: TransactionState<TDatabaseSchema> = {
					transaction: trx,
					committed: false,
					afterCommit: [],
				};

				return await asyncLocalDb.run(state, async () => {
					try {
						const result = await callback({
							transaction: trx,
							afterCommit: (callback) => {
								state.afterCommit.push(callback);
							},
						});

						state.committed = true;

						const afterCommitPromises = state.afterCommit.map((cb) => cb());
						await Promise.all(afterCommitPromises);

						return result;
					} catch (error) {
						state.committed = false;
						throw error;
					}
				});
			});
		},

		selectNoFrom: () => {
			return kysely.selectNoFrom([
				sql<number>`1`.as('one'),
				sql<string>`'test'`.as('constantText'),
				sql<string>`CURRENT_TIMESTAMP`.as('currentDate'),
				sql<number>`RANDOM()`.as('randomValue'),
			]);
		},

		tuple: <ItemTypes extends unknown[]>(items: readonly [...ItemTypes]) => {
			// Check if we have a supported number of items (Kysely supports up to 5)
			if (items.length < 1 || items.length > 5) {
				throw new Error(
					`Tuple must have between 1 and 5 items. Received ${items.length} items.`
				);
			}

			// Create a function that will use the expression builder when called
			// We use unknown here since we don't know the exact type of the expression builder
			return (expressionBuilder: unknown) => {
				const eb = expressionBuilder as {
					tuple: (...items: unknown[]) => unknown;
				};

				if (items.length === 1) {
					return eb.tuple(items[0]);
				} else if (items.length === 2) {
					return eb.tuple(items[0], items[1]);
				} else if (items.length === 3) {
					return eb.tuple(items[0], items[1], items[2]);
				} else if (items.length === 4) {
					return eb.tuple(items[0], items[1], items[2], items[3]);
				} else {
					return eb.tuple(items[0], items[1], items[2], items[3], items[4]);
				}
			};
		},

		cast: <ResultType>(value: unknown, dataType: string) => {
			// Use a sql tag to generate the CAST expression with explicit typing
			return sql<ResultType>`CAST(${value} AS ${sql.raw(dataType)})`;
		},

		updateColumn: <
			TTableName extends keyof TDatabaseSchema & string,
			ColumnName extends keyof TDatabaseSchema[TTableName] & string,
		>(
			table: TTableName,
			column: ColumnName,
			value: TDatabaseSchema[TTableName][ColumnName]
		) => {
			const queryBuilder = kysely.updateTable(table);
			// Workaround for Kysely type system - using 'as any' just for the set method
			// This will be fixed in Kysely 0.27.0
			return (queryBuilder as any).set(column, value);
		},

		streamFrom: <
			TTableName extends keyof TDatabaseSchema & string,
			ColumnName extends keyof TDatabaseSchema[TTableName] & string,
		>(
			table: TTableName,
			columns: readonly ColumnName[]
		) => {
			if (!db.isSqlite()) {
				throw new Error(
					'Streaming is currently only supported with SQLite dialect'
				);
			}

			// Using the appropriate type cast for the expression builder
			return kysely.selectFrom(table).select((eb) => {
				// Cast expression builder to a type that supports ref
				const expressionBuilder = eb as {
					ref: (path: string) => unknown;
				};

				// Map columns to reference expressions
				return columns.map((column) =>
					expressionBuilder.ref(`${table}.${String(column)}`)
				) as any;
			});
		},

		findNotNull: <
			TTableName extends keyof TDatabaseSchema & string,
			ColumnName extends keyof TDatabaseSchema[TTableName] & string,
		>(
			table: TTableName,
			column: ColumnName
		) => {
			return (
				kysely
					.selectFrom(table)
					.selectAll()
					// @ts-expect-error - Will fix when Kysely 0.27.0 upgrade is complete
					.where((eb) => eb(`${table}.${column}`, 'is not', null))
			);
		},

		insertDefault: <TTableName extends keyof TDatabaseSchema & string>(
			table: TTableName
		) => {
			return kysely.insertInto(table).defaultValues();
		},

		createMigrator: (options: MigratorOptions): Migrator => {
			return new Migrator({
				db: db.db(),
				provider: options.provider,
				// Support for Kysely 0.27.2+
				allowUnorderedMigrations: options.allowUnorderedMigrations,
			});
		},
	};

	return db;
}
