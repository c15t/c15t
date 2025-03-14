import type {
	Expression,
	ExpressionBuilder,
	ExpressionOrFactory,
	InsertQueryBuilder,
	Kysely,
	OperandExpression,
	ReferenceExpression,
	SqlBool,
	UpdateQueryBuilder,
} from 'kysely';
import type {
	BinaryOperatorExpression,
	OperandValueExpressionOrList,
} from 'node_modules/kysely/dist/esm/parser/binary-operation-parser';
import type { InsertExpression } from 'node_modules/kysely/dist/esm/parser/insert-values-parser';
import type { TableReference } from 'node_modules/kysely/dist/esm/parser/table-parser';
import superjson from 'superjson';
import { type Field, type Primitive, generateId } from '~/db/core/fields';
import type {
	EntityInput,
	EntityName,
	EntityOutput,
	EntityTypeMap,
} from '~/db/core/types';
import { C15TOptions } from '~/types';
import {
	Adapter,
	TableFields,
	Where,
	applyDefaultValue,
	getConsentTables,
} from '../..';
import type { Database, KyselyDatabaseType } from './types';

/**
 * Type alias for Kysely field references
 *
 * This type helps bridge the gap between c15t's field paths and Kysely's
 * strongly typed reference expressions.
 *
 * @internal
 */
type KyselyFieldRef = ReferenceExpression<Database, keyof Database>;

/**
 * Type for expression builder functions used in queries
 *
 * @internal
 */
type ExpressionFn = (
	eb: ExpressionBuilder<Database, keyof Database>
) => unknown;

/**
 * Interface for where conditions in Kysely queries
 *
 * This interface defines the structure of query conditions used
 * in database operations. It supports various operators and connectors
 * for building complex query conditions.
 *
 * @typeParam EntityType - The entity type being queried
 */
export interface WhereCondition<EntityType extends EntityName> {
	/**
	 * The field to apply the condition to
	 */
	field: keyof EntityTypeMap[EntityType] | 'id';

	/**
	 * The value to compare against
	 */
	value: unknown;

	/**
	 * The operator to use for comparison
	 *
	 * @default "="
	 */
	operator?:
		| 'in'
		| 'eq'
		| 'ne'
		| 'lt'
		| 'lte'
		| 'gt'
		| 'gte'
		| 'contains'
		| 'starts_with'
		| 'ends_with'
		| 'ilike'
		| '=';

	/**
	 * The logical connector to use with previous conditions
	 *
	 * @default "AND"
	 */
	connector?: 'AND' | 'OR';
}

/**
 * Configuration options for the Kysely adapter
 *
 * @example
 * ```typescript
 * const config: KyselyAdapterConfig = {
 *   type: 'postgres' // Explicitly set the database type
 * };
 * ```
 */
export interface KyselyAdapterConfig {
	/**
	 * Database type to use with the adapter
	 *
	 * Setting this explicitly can override the auto-detected type
	 * and can be necessary in some environments where detection fails.
	 */
	type?: KyselyDatabaseType;
}

/**
 * Type alias for expression results in Kysely queries
 *
 * @internal
 */
type ExpressionResult<DB> = Expression<DB>;

// Note: Throughout this adapter, we use "as any" type assertions in several places
// to bridge the gap between our runtime-generated field references and Kysely's
// strongly typed query builder. This is necessary due to the dynamic nature of our
// schema, where field names and references are determined at runtime.
// An alternative approach would be to generate fully typed interfaces at build time.

/**
 * Creates entity transformation utilities for the Kysely adapter
 *
 * This function creates helper methods for converting between c15t's
 * data format and Kysely's query format, handling field mapping,
 * value transformation, and query building.
 *
 * @internal This function is used internally by the kyselyAdapter
 * @param db - The Kysely database instance
 * @param options - The c15t options
 * @param config - Optional Kysely adapter configuration
 * @returns An object containing entity transformation utilities
 */
const createEntityTransformer = (
	db: Kysely<Database>,
	options: C15TOptions,
	config?: KyselyAdapterConfig
) => {
	const schema = getConsentTables(options);

	/**
	 * Gets the database field name for a model field
	 *
	 * @internal
	 * @typeParam EntityType - The entity type
	 * @param model - The model name
	 * @param field - The field name in the c15t model
	 * @returns The corresponding field name in the database schema
	 */
	function getField<EntityType extends EntityName>(
		model: EntityType,
		field: keyof EntityTypeMap[EntityType] | string
	) {
		if (field === 'id') {
			return field;
		}
		const modelFields = schema[model]?.fields;
		const f = modelFields
			? (modelFields as Record<string, Field>)[field as string]
			: undefined;
		if (!f) {
			// biome-ignore lint/suspicious/noConsoleLog: no Logger implementation
			// biome-ignore lint/suspicious/noConsole: no Logger implementation
			console.log('Field not found', model, field);
		}
		return f?.fieldName || (field as string);
	}

	/**
	 * Transforms a value from c15t format to database format
	 *
	 * Handles type conversions like booleans to integers for SQLite,
	 * dates to ISO strings, etc.
	 *
	 * @internal
	 * @typeParam EntityType - The entity type
	 * @param value - The value to transform
	 * @param model - The model name
	 * @param field - The field name
	 * @returns The transformed value for database storage
	 */
	function transformValueToDB<EntityType extends EntityName>(
		value: unknown,
		model: EntityType,
		field: keyof EntityTypeMap[EntityType] | string
	): unknown {
		if (field === 'id') {
			return value;
		}
		const { type = 'sqlite' } = config || {};
		const modelFields = schema[model]?.fields;
		const f = modelFields
			? (modelFields as Record<string, Field>)[field as string]
			: undefined;
		if (
			f?.type === 'boolean' &&
			(type === 'sqlite' || type === 'mssql') &&
			value !== null &&
			value !== undefined
		) {
			return value ? 1 : 0;
		}
		if (f?.type === 'date' && value && value instanceof Date) {
			return type === 'sqlite' ? value.toISOString() : value;
		}
		// Handle JSON field type
		if (f?.type === 'json' && value !== null && value !== undefined) {
			// For PostgreSQL and MySQL, we can use the native JSON types
			if (type === 'postgres' || type === 'mysql') {
				// The database handles the JSON as is
				return value;
			}
			// For SQLite and other databases, stringify the JSON using SuperJSON
			return superjson.stringify(value);
		}
		return value;
	}

	/**
	 * Transforms a value from database format to c15t format
	 *
	 * Handles type conversions like integers to booleans for SQLite,
	 * ISO strings to Date objects, etc.
	 *
	 * @internal
	 * @typeParam EntityType - The entity type
	 * @param value - The value from the database
	 * @param model - The model name
	 * @param field - The field name
	 * @returns The transformed value for c15t usage
	 */
	function transformValueFromDB<EntityType extends EntityName>(
		value: unknown,
		model: EntityType,
		field: keyof EntityTypeMap[EntityType] | string
	): unknown {
		const { type = 'sqlite' } = config || {};

		const modelFields = schema[model]?.fields;
		const f = modelFields
			? (modelFields as Record<string, Field>)[field as string]
			: undefined;
		if (
			f?.type === 'boolean' &&
			(type === 'sqlite' || type === 'mssql') &&
			value !== null
		) {
			return value === 1;
		}
		if (f?.type === 'date' && value) {
			return new Date(value as string);
		}
		// Handle JSON field type
		if (f?.type === 'json' && value !== null && value !== undefined) {
			// For PostgreSQL and MySQL, the value might already be an object
			if (
				(type === 'postgres' || type === 'mysql') &&
				typeof value === 'object'
			) {
				return value;
			}
			// For SQLite and other databases or string JSON from any database
			if (typeof value === 'string') {
				try {
					// Use SuperJSON to parse the JSON string, preserving complex types
					return superjson.parse(value as string);
				} catch {
					// If SuperJSON parsing fails, try standard JSON.parse as fallback
					try {
						return JSON.parse(value as string);
					} catch {
						// If all parsing fails, return the original value
						return value;
					}
				}
			}
		}
		return value;
	}

	/**
	 * Gets the database entity name for a model
	 *
	 * @internal
	 * @typeParam EntityType - The entity type
	 * @param model - The model name
	 * @returns The database table name
	 */
	function getEntityName<EntityType extends EntityName>(
		model: EntityType
	): TableReference<Database> {
		return schema[model].entityName as TableReference<Database>;
	}

	return {
		/**
		 * Transforms input data from c15t format to database format
		 *
		 * @internal
		 * @typeParam EntityType - The entity type
		 * @param data - The data to transform
		 * @param model - The model name
		 * @param action - Whether this is a create or update operation
		 * @returns Transformed data for database insertion/update
		 */
		transformInput<EntityType extends EntityName>(
			data: EntityInput<EntityType>,
			model: EntityType,
			action: 'create' | 'update'
		): InsertExpression<Database, keyof Database> {
			// Initialize with empty object
			const transformedData: Record<string, unknown> = {};

			// Handle ID for create operations
			if (action === 'create') {
				// If an ID is provided in the input data, use it
				// Otherwise generate a new one with the appropriate prefix
				transformedData.id =
					data.id ||
					(options.advanced?.generateId
						? options.advanced.generateId({ model })
						: generateId(schema[model].entityPrefix));
			}

			const fields = schema[model].fields;
			for (const field in fields) {
				if (Object.hasOwn(fields, field)) {
					const value = data[field as keyof typeof data];
					const fieldInfo = (fields as Record<string, Field>)[field];
					const fieldName = fieldInfo?.fieldName || field;
					if (fieldInfo) {
						transformedData[fieldName] = applyDefaultValue(
							transformValueToDB(value, model, field) as Primitive,
							fieldInfo,
							action
						);
					}
				}
			}

			return transformedData as InsertExpression<Database, keyof Database>;
		},

		/**
		 * Transforms output data from database format to c15t format
		 *
		 * @internal
		 * @typeParam EntityType - The entity type
		 * @param data - The data from the database
		 * @param model - The model name
		 * @param select - Optional array of fields to select
		 * @returns Transformed data for c15t or null if no data
		 */
		transformOutput<EntityType extends EntityName>(
			data: Record<string, unknown> | null,
			model: EntityType,
			select: string[] = []
		): EntityOutput<EntityType> | null {
			if (!data) {
				return null;
			}

			// Initialize transformedData based on conditions
			const transformedData: Record<string, unknown> = {};

			// Add id to transformed data if needed
			if (data.id && (select.length === 0 || select.includes('id'))) {
				transformedData.id = data.id;
			}

			const tableSchema = schema[model]?.fields;
			for (const key in tableSchema) {
				if (select.length && !select.includes(key)) {
					continue;
				}
				const field = (tableSchema as Record<string, Field>)[key];
				if (field) {
					transformedData[key] = transformValueFromDB(
						data[field.fieldName || key],
						model,
						key
					);
				}
			}
			return transformedData as EntityOutput<EntityType>;
		},

		/**
		 * Converts c15t where clauses to Kysely query conditions
		 *
		 * @internal
		 * @typeParam EntityType - The entity type
		 * @param model - The model name
		 * @param whereConditions - Array of where conditions
		 * @returns Object with AND and OR expressions for Kysely
		 */
		convertWhereClause<EntityType extends EntityName>(
			model: EntityType,
			whereConditions?: WhereCondition<EntityType>[]
		): {
			and: ExpressionFn[] | null;
			or: ExpressionFn[] | null;
		} {
			if (!whereConditions || whereConditions.length === 0) {
				return {
					and: null,
					or: null,
				};
			}

			const conditions = {
				and: [] as ExpressionFn[],
				or: [] as ExpressionFn[],
			};

			for (const condition of whereConditions) {
				let {
					field: _field,
					value,
					operator = '=',
					connector = 'AND',
				} = condition;
				const fieldString = getField<EntityType>(model, _field);
				value = transformValueToDB<EntityType>(value, model, _field);

				const expr: ExpressionFn = (eb) => {
					// For type safety, cast field to a reference expression
					const dbField = fieldString as unknown as KyselyFieldRef;

					if (operator.toLowerCase() === 'in') {
						return eb(dbField, 'in', Array.isArray(value) ? value : [value]);
					}

					if (operator === 'contains') {
						return eb(dbField, 'like', `%${value}%`);
					}

					if (operator === 'starts_with') {
						return eb(dbField, 'like', `${value}%`);
					}

					if (operator === 'ends_with') {
						return eb(dbField, 'like', `%${value}`);
					}

					if (operator === 'ilike') {
						// Use SQL LOWER function for case-insensitive comparison
						const lowerField = eb.fn<string>('lower', [dbField]);
						const lowerValue = eb.fn<string>('lower', [
							eb.val(value?.toString()),
						]);
						return eb(
							lowerField,
							'like',
							lowerValue
						) as ExpressionResult<Database>;
					}

					if (operator === 'eq') {
						return eb(dbField, '=', value);
					}

					if (operator === 'ne') {
						return eb(dbField, '<>', value);
					}

					if (operator === 'gt') {
						return eb(dbField, '>', value);
					}

					if (operator === 'gte') {
						return eb(dbField, '>=', value);
					}

					if (operator === 'lt') {
						return eb(dbField, '<', value);
					}

					if (operator === 'lte') {
						return eb(dbField, '<=', value);
					}

					return eb(dbField, operator as BinaryOperatorExpression, value);
				};

				if (connector === 'OR') {
					conditions.or.push(expr);
				} else {
					conditions.and.push(expr);
				}
			}

			return {
				and: conditions.and.length ? conditions.and : null,
				or: conditions.or.length ? conditions.or : null,
			};
		},

		/**
		 * Helper for returning data from operations in different database types
		 *
		 * @internal
		 * @typeParam EntityType - The entity type
		 * @param values - The values being inserted/updated
		 * @param builder - The query builder
		 * @param model - The model name
		 * @param where - Where conditions for finding the modified record
		 * @returns The result of the operation
		 */
		async withReturning<EntityType extends EntityName>(
			values: EntityInput<EntityType>,
			builder:
				| InsertQueryBuilder<Database, keyof Database, keyof Database>
				| UpdateQueryBuilder<
						Database,
						keyof Database,
						keyof Database,
						keyof Database
				  >,
			model: EntityType,
			where: WhereCondition<EntityType>[]
		): Promise<Record<string, unknown> | null> {
			let res: Record<string, unknown> | null = null;
			if (config?.type === 'mysql') {
				//this isn't good, but kysely doesn't support returning in mysql and it doesn't return the inserted id. Change this if there is a better way.
				await builder.execute();
				// Get the field and value to find the created/updated record
				const whereCondition = where[0];
				const field = values.id
					? 'id'
					: ((whereCondition?.field ?? 'id') as string);
				const value =
					values[field as keyof typeof values] ?? whereCondition?.value;

				// Safe cast for where field
				const fieldString = getField(
					model,
					field
				) as unknown as ExpressionOrFactory<
					Database,
					keyof Database,
					KyselyFieldRef
				>;

				res = (await db
					.selectFrom(getEntityName(model))
					.selectAll()
					.where((eb) =>
						eb(
							fieldString,
							'=',
							value as OperandValueExpressionOrList<
								Database,
								keyof Database,
								KyselyFieldRef
							>
						)
					)
					.executeTakeFirst()) as Record<string, unknown> | null;
				return res;
			}
			if (config?.type === 'mssql') {
				res = (await builder
					.outputAll('inserted')
					.executeTakeFirst()) as Record<string, unknown> | null;
				return res;
			}
			res = (await builder.returningAll().executeTakeFirst()) as Record<
				string,
				unknown
			> | null;
			return res;
		},
		getEntityName,
		getField,
	};
};

/**
 * Creates a c15t adapter for Kysely ORM
 *
 * This factory function creates an adapter that allows c15t to use Kysely ORM
 * as its database layer. It supports PostgreSQL, MySQL, SQLite, and MSSQL.
 *
 * @param db - The Kysely database instance
 * @param config - Optional configuration for the Kysely adapter
 * @returns A c15t adapter factory function
 *
 * @example
 * ```typescript
 * import { Kysely, PostgresDialect } from 'kysely';
 * import { Pool } from 'pg';
 * import { c15tInstance } from '@c15t/backend';
 * import { kyselyAdapter } from '@c15t/adapters/kysely';
 *
 * // Create a Postgres connection pool
 * const pool = new Pool({
 *   host: 'localhost',
 *   database: 'consent_db',
 *   user: 'postgres',
 *   password: 'password'
 * });
 *
 * // Create Kysely instance
 * const db = new Kysely({
 *   dialect: new PostgresDialect({ pool })
 * });
 *
 * // Create the c15t instance with Kysely adapter
 * const c15t = c15tInstance({
 *   storage: kyselyAdapter(db, { type: 'postgres' }),
 *   // Other c15t options...
 *   secret: process.env.SECRET
 * });
 *
 * // Use in your application
 * export default c15tInstance.handler;
 * ```
 */
export const kyselyAdapter =
	(db: Kysely<Database>, config?: KyselyAdapterConfig) =>
	(opts: C15TOptions): Adapter => {
		const {
			transformInput,
			withReturning,
			transformOutput,
			convertWhereClause,
			getEntityName,
			getField,
		} = createEntityTransformer(db, opts, config);
		return {
			id: 'kysely',
			/**
			 * Creates a new record in the database
			 *
			 * @typeParam Model - The model type
			 * @typeParam Data - The data type
			 * @typeParam Result - The result type
			 * @param data - The data for the create operation
			 * @returns The created record
			 */
			async create<
				Model extends EntityName,
				Data extends Record<string, unknown>,
				Result extends TableFields<Model>,
			>(data: {
				model: Model;
				data: Data;
				select?: (keyof Result)[];
			}): Promise<Result> {
				const { model, data: values, select } = data;
				const transformed = transformInput(
					values as EntityInput<Model>,
					model,
					'create'
				);

				// Safe cast for table name
				const tableName = getEntityName(model);

				// Use type assertion for builder to match Kysely's expectations
				const builder = db
					.insertInto(tableName as keyof Database)
					.values(transformed);

				const result = await withReturning(
					transformed as EntityInput<Model>,
					builder as unknown as InsertQueryBuilder<
						Database,
						keyof Database,
						keyof Database
					>,
					model,
					[]
				);

				const output = transformOutput(
					result,
					model,
					select as string[]
				) as unknown as Result;

				return output;
			},
			/**
			 * Finds a single record matching the where conditions
			 *
			 * @typeParam Model - The model type
			 * @typeParam Result - The result type
			 * @param data - The data for the find operation
			 * @returns The found record or null if not found
			 */
			async findOne<
				Model extends EntityName,
				Result extends TableFields<Model>,
			>(data: {
				model: Model;
				where: Where<Model>;
				select?: (keyof Result)[];
			}): Promise<Result | null> {
				const { model, where, select } = data;
				// Convert Where from Adapter type to internal WhereCondition type
				const whereArray = (Array.isArray(where)
					? where
					: [where]) as unknown as WhereCondition<Model>[];
				const { and, or } = convertWhereClause(model, whereArray);

				// Safe cast for table name
				const tableName = getEntityName(model);
				let query = db
					.selectFrom(tableName as unknown as keyof Database)
					.selectAll();

				if (and) {
					query = query.where((eb) => {
						const conditions = and.map((expr) =>
							expr(eb)
						) as OperandExpression<SqlBool>[];
						return eb.and(conditions);
					});
				}
				if (or) {
					query = query.where((eb) => {
						const conditions = or.map((expr) =>
							expr(eb)
						) as OperandExpression<SqlBool>[];
						return eb.or(conditions);
					});
				}
				const res = await query.executeTakeFirst();
				if (!res) {
					return null;
				}
				return transformOutput(
					res as Record<string, unknown>,
					model,
					select as string[]
				) as unknown as Result | null;
			},
			/**
			 * Finds multiple records matching the where conditions
			 *
			 * @typeParam Model - The model type
			 * @typeParam Result - The result type
			 * @param data - The data for the find operation
			 * @returns Array of matching records
			 */
			async findMany<
				Model extends EntityName,
				Result extends TableFields<Model>,
			>(data: {
				model: Model;
				where?: Where<Model>;
				limit?: number;
				sortBy?: { field: 'id' | keyof Result; direction: 'asc' | 'desc' };
				offset?: number;
			}): Promise<Result[]> {
				const { model, where, limit, offset, sortBy } = data;
				// Convert Where from Adapter type to internal WhereCondition type
				const whereArray = where
					? ((Array.isArray(where)
							? where
							: [where]) as unknown as WhereCondition<Model>[])
					: undefined;
				const { and, or } = convertWhereClause(model, whereArray);

				// Safe cast for table name
				const tableName = getEntityName(model);
				let query = db.selectFrom(tableName as unknown as keyof Database);

				if (and) {
					query = query.where((eb) => {
						const conditions = and.map((expr) =>
							expr(eb)
						) as OperandExpression<SqlBool>[];
						return eb.and(conditions);
					});
				}
				if (or) {
					query = query.where((eb) => {
						const conditions = or.map((expr) =>
							expr(eb)
						) as OperandExpression<SqlBool>[];
						return eb.or(conditions);
					});
				}
				if (config?.type === 'mssql') {
					if (!offset) {
						query = query.top(limit || 100);
					}
				} else {
					query = query.limit(limit || 100);
				}
				if (sortBy) {
					// Safe cast for sort field
					const sortFieldString = getField(model, sortBy.field as string);

					query = query.orderBy(
						sortFieldString as unknown as KyselyFieldRef,
						sortBy.direction
					);
				}
				if (offset) {
					if (config?.type === 'mssql') {
						if (!sortBy) {
							// Safe cast for id field
							query = query.orderBy('id' as unknown as KyselyFieldRef);
						}
						query = query.offset(offset).fetch(limit || 100);
					} else {
						query = query.offset(offset);
					}
				}

				const res = await query.selectAll().execute();
				if (!res) {
					return [] as unknown as Result[];
				}
				return res.map(
					(r) =>
						transformOutput(
							r as Record<string, unknown>,
							model
						) as unknown as Result
				);
			},
			/**
			 * Updates a single record matching the where conditions
			 *
			 * @typeParam Model - The model type
			 * @typeParam Result - The result type
			 * @param data - The data for the update operation
			 * @returns The updated record or null if not found
			 */
			async update<
				Model extends EntityName,
				Result extends TableFields<Model>,
			>(data: {
				model: Model;
				where: Where<Model>;
				update: EntityInput<Model>;
			}): Promise<Result | null> {
				const { model, where, update: values } = data;
				// Convert Where from Adapter type to internal WhereCondition type
				const whereArray = (Array.isArray(where)
					? where
					: [where]) as unknown as WhereCondition<Model>[];
				const { and, or } = convertWhereClause(model, whereArray);
				const transformedData = transformInput(
					values as EntityInput<Model>,
					model,
					'update'
				);

				// Safe cast for table name
				const tableName = getEntityName(model);
				let query = db
					.updateTable(tableName as unknown as keyof Database)
					.set(transformedData as Record<string, unknown>);

				if (and) {
					query = query.where((eb) => {
						const conditions = and.map((expr) =>
							expr(eb)
						) as OperandExpression<SqlBool>[];
						return eb.and(conditions);
					});
				}
				if (or) {
					query = query.where((eb) => {
						const conditions = or.map((expr) =>
							expr(eb)
						) as OperandExpression<SqlBool>[];
						return eb.or(conditions);
					});
				}
				const result = await withReturning(
					transformedData as EntityInput<Model>,
					query as unknown as UpdateQueryBuilder<
						Database,
						keyof Database,
						keyof Database,
						keyof Database
					>,
					model,
					whereArray
				);
				return transformOutput(result, model) as unknown as Result | null;
			},
			/**
			 * Updates multiple records matching the where conditions
			 *
			 * @typeParam Model - The model type
			 * @typeParam Result - The result type
			 * @param data - The data for the update operation
			 * @returns Array of updated records
			 */
			async updateMany<
				Model extends EntityName,
				Result extends TableFields<Model>,
			>(data: {
				model: Model;
				where: Where<Model>;
				update: Partial<EntityInput<Model>>;
			}): Promise<Result[]> {
				const { model, where, update: values } = data;
				// Convert Where from Adapter type to internal WhereCondition type
				const whereArray = (Array.isArray(where)
					? where
					: [where]) as unknown as WhereCondition<Model>[];
				const { and, or } = convertWhereClause(model, whereArray);
				const transformedData = transformInput(
					values as EntityInput<Model>,
					model,
					'update'
				);

				// Safe cast for table name
				const tableName = getEntityName(model);
				let query = db
					.updateTable(tableName as unknown as keyof Database)
					.set(transformedData as Record<string, unknown>);

				if (and) {
					query = query.where((eb) => {
						const conditions = and.map((expr) =>
							expr(eb)
						) as OperandExpression<SqlBool>[];
						return eb.and(conditions);
					});
				}
				if (or) {
					query = query.where((eb) => {
						const conditions = or.map((expr) =>
							expr(eb)
						) as OperandExpression<SqlBool>[];
						return eb.or(conditions);
					});
				}
				await query.execute();

				// After update is complete, fetch the updated records using the same where conditions
				// Safe cast for table name
				let selectQuery = db
					.selectFrom(tableName as unknown as keyof Database)
					.selectAll();

				if (and) {
					selectQuery = selectQuery.where((eb) => {
						const conditions = and.map((expr) =>
							expr(eb)
						) as OperandExpression<SqlBool>[];
						return eb.and(conditions);
					});
				}
				if (or) {
					selectQuery = selectQuery.where((eb) => {
						const conditions = or.map((expr) =>
							expr(eb)
						) as OperandExpression<SqlBool>[];
						return eb.or(conditions);
					});
				}

				const fetchedResults = await selectQuery.execute();

				// Transform the results using the same pattern as findMany
				if (!fetchedResults || fetchedResults.length === 0) {
					return [] as unknown as Result[];
				}

				return fetchedResults.map(
					(record) =>
						transformOutput(
							record as Record<string, unknown>,
							model
						) as unknown as Result
				);
			},
			/**
			 * Counts records matching the where conditions
			 *
			 * @typeParam Model - The model type
			 * @param data - The data for the count operation
			 * @returns The count of matching records
			 */
			async count<Model extends EntityName>(data: {
				model: Model;
				where?: Where<Model>;
			}): Promise<number> {
				const { model, where } = data;
				// Convert Where from Adapter type to internal WhereCondition type
				const whereArray = where
					? ((Array.isArray(where)
							? where
							: [where]) as unknown as WhereCondition<Model>[])
					: undefined;
				const { and, or } = convertWhereClause(model, whereArray);

				// Safe cast for table name
				const tableName = getEntityName(model);
				let query = db
					.selectFrom(tableName as unknown as keyof Database)
					.select((eb) => eb.fn.count<number>('id').as('count'));

				if (and) {
					query = query.where((eb) => {
						const conditions = and.map((expr) =>
							expr(eb)
						) as OperandExpression<SqlBool>[];
						return eb.and(conditions);
					});
				}
				if (or) {
					query = query.where((eb) => {
						const conditions = or.map((expr) =>
							expr(eb)
						) as OperandExpression<SqlBool>[];
						return eb.or(conditions);
					});
				}
				const res = await query.execute();
				// Get count from result
				const count = (res[0] as Record<string, unknown>)?.count;
				return typeof count === 'number' ? count : 0;
			},
			/**
			 * Deletes a single record matching the where conditions
			 *
			 * @typeParam Model - The model type
			 * @param data - The data for the delete operation
			 */
			async delete<Model extends EntityName>(data: {
				model: Model;
				where: Where<Model>;
			}): Promise<void> {
				const { model, where } = data;
				// Convert Where from Adapter type to internal WhereCondition type
				const whereArray = (Array.isArray(where)
					? where
					: [where]) as unknown as WhereCondition<Model>[];
				const { and, or } = convertWhereClause(model, whereArray);

				// Safe cast for table name
				const tableName = getEntityName(model);
				let query = db.deleteFrom(tableName as unknown as keyof Database);

				if (and) {
					query = query.where((eb) => {
						const conditions = and.map((expr) =>
							expr(eb)
						) as OperandExpression<SqlBool>[];
						return eb.and(conditions);
					});
				}

				if (or) {
					query = query.where((eb) => {
						const conditions = or.map((expr) =>
							expr(eb)
						) as OperandExpression<SqlBool>[];
						return eb.or(conditions);
					});
				}
				await query.execute();
			},
			/**
			 * Deletes multiple records matching the where conditions
			 *
			 * @typeParam Model - The model type
			 * @param data - The data for the delete operation
			 * @returns The number of records deleted
			 */
			async deleteMany<Model extends EntityName>(data: {
				model: Model;
				where: Where<Model>;
			}): Promise<number> {
				const { model, where } = data;
				// Convert Where from Adapter type to internal WhereCondition type
				const whereArray = (Array.isArray(where)
					? where
					: [where]) as unknown as WhereCondition<Model>[];
				const { and, or } = convertWhereClause(model, whereArray);

				// Safe cast for table name
				const tableName = getEntityName(model);
				let query = db.deleteFrom(tableName as unknown as keyof Database);
				if (and) {
					query = query.where((eb) => {
						const conditions = and.map((expr) =>
							expr(eb)
						) as OperandExpression<SqlBool>[];
						return eb.and(conditions);
					});
				}
				if (or) {
					query = query.where((eb) => {
						const conditions = or.map((expr) =>
							expr(eb)
						) as OperandExpression<SqlBool>[];
						return eb.or(conditions);
					});
				}
				const result = await query.execute();
				const count = result.length;
				return count;
			},
			/**
			 * Executes a function within a database transaction
			 *
			 * This method wraps Kysely's transaction functionality to provide a consistent interface
			 * for executing multiple database operations atomically. Falls back to direct execution
			 * if transactions are disabled or not supported by the database.
			 *
			 * @typeParam ResultType - The type of data returned by the transaction
			 * @param data - The transaction data containing the callback function
			 * @returns A promise that resolves with the result of the callback function
			 * @throws {Error} If the transaction fails to complete
			 */
			async transaction<ResultType>(data: {
				callback: (transactionAdapter: Adapter) => Promise<ResultType>;
			}): Promise<ResultType> {
				const { callback } = data;

				// Check if transactions are explicitly disabled
				if (opts.advanced?.disableTransactions) {
					const regularAdapter = kyselyAdapter(db, config)(opts);
					return await callback(regularAdapter);
				}

				try {
					return await db.transaction().execute(async (trx) => {
						const transactionAdapter = kyselyAdapter(trx, config)(opts);
						return await callback(transactionAdapter);
					});
				} catch (error) {
					// Check if the error indicates transactions are not supported
					if (
						error instanceof Error &&
						(error.message.includes('transactions are not supported') ||
							error.message.toLowerCase().includes('no transaction support'))
					) {
						// Log warning about disableTransactions option
						// biome-ignore lint/suspicious/noConsole: this is a warning
						console.warn(
							'Warning: Database transaction failed. If your database does not support transactions, ' +
								'you can disable this warning by setting opts.advanced.disableTransactions to true.'
						);
						// Fallback: execute without transaction
						const regularAdapter = kyselyAdapter(db, config)(opts);
						return await callback(regularAdapter);
					}
					throw error;
				}
			},
			options: config,
		};
	};
