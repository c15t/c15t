import { Kysely, sql } from 'kysely';
import { CoreOptions, EntityName, Field } from '../core-types';
import type {
	Adapter,
	AdapterSchemaCreation,
	SortOptions,
	Where,
	WhereCondition,
} from '../types';
import { applyFieldDefaultValue } from '../utils';

/**
 * Configuration options for the Kysely adapter
 *
 * This interface defines the configuration options for the Kysely adapter,
 * including which database provider to use.
 */
export interface KyselyConfig {
	/**
	 * Database provider.
	 *
	 * Specifies which database engine the Kysely client is configured to use.
	 * This affects how queries are constructed and executed.
	 */
	dialect: 'postgres' | 'mysql' | 'sqlite';

	/**
	 * Schema name to use for tables.
	 *
	 * Optional schema name qualifier for database operations.
	 */
	schema?: string;

	/**
	 * Additional configuration options for the Kysely adapter.
	 */
	options?: Record<string, unknown>;
}

/**
 * Interface for the Doubletie query-builder Database instance
 *
 * This represents the database instance created by the Doubletie query-builder.
 */
interface DoubletieDatabase {
	/** Get a model by name */
	getModel: (modelName: string) => any;
	/** Begin a transaction */
	transaction: <T>(callback: (trx: any) => Promise<T>) => Promise<T>;
	/** Raw Kysely instance */
	kysely: Kysely<any>;
}

/**
 * Creates entity transformation utilities for the Kysely adapter
 *
 * This function creates helper methods for converting between the generic
 * data format and Kysely's query format, handling field mapping,
 * value transformation, and query building.
 *
 * @internal This function is used internally by the kyselyAdapter
 * @param db - The Doubletie database instance
 * @param config - The Kysely adapter configuration
 * @param options - The adapter options
 * @returns An object containing entity transformation utilities
 */
const createEntityTransformer = (
	db: DoubletieDatabase,
	config: KyselyConfig,
	options: CoreOptions
) => {
	const schema = options.schema || {};

	/**
	 * Gets the entity name for the database
	 *
	 * @param model - The model name in the ORM
	 * @returns The entity name to use in the database
	 */
	const getEntityName = (model: string): string => {
		return model;
	};

	/**
	 * Converts a where clause to a Kysely filter format
	 *
	 * @param model - The model name
	 * @param where - The where conditions
	 * @returns The constructed filter callback for Kysely
	 */
	function convertWhereClause<EntityType extends EntityName>(
		model: EntityType,
		where?: Where<EntityType>
	): (qb: any) => any {
		if (!where || where.length === 0) {
			return (qb: any) => qb;
		}

		return (qb: any) => {
			let currentQb = qb;

			for (let i = 0; i < where.length; i++) {
				const { field, operator, value, connector } = where[
					i
				] as WhereCondition<EntityType>;

				// For the first condition, use where
				// For AND conditions, use andWhere
				// For OR conditions, use orWhere
				const method =
					i === 0 ? 'where' : connector === 'OR' ? 'orWhere' : 'andWhere';

				// Handle different operators
				if (operator === 'eq') {
					currentQb = currentQb[method](field, '=', value);
				} else if (operator === 'ne') {
					currentQb = currentQb[method](field, '!=', value);
				} else if (operator === 'gt') {
					currentQb = currentQb[method](field, '>', value);
				} else if (operator === 'gte') {
					currentQb = currentQb[method](field, '>=', value);
				} else if (operator === 'lt') {
					currentQb = currentQb[method](field, '<', value);
				} else if (operator === 'lte') {
					currentQb = currentQb[method](field, '<=', value);
				} else if (operator === 'in') {
					currentQb = currentQb[method](field, 'in', value);
				} else if (operator === 'contains') {
					currentQb = currentQb[method](field, 'like', `%${value}%`);
				} else if (operator === 'starts_with') {
					currentQb = currentQb[method](field, 'like', `${value}%`);
				} else if (operator === 'ends_with') {
					currentQb = currentQb[method](field, 'like', `%${value}`);
				} else if (operator === 'ilike') {
					// Not all databases support ilike
					if (config.dialect === 'postgres') {
						currentQb = currentQb[method](field, 'ilike', `%${value}%`);
					} else {
						// For MySQL and SQLite, we'll use LOWER() as a fallback
						currentQb = currentQb[method](
							sql`LOWER(${field})`,
							'like',
							`%${String(value).toLowerCase()}%`
						);
					}
				} else {
					// Default to equals
					currentQb = currentQb[method](field, '=', value);
				}
			}

			return currentQb;
		};
	}

	/**
	 * Transforms input data for database operations
	 *
	 * @param data - The input data
	 * @param model - The model name
	 * @param action - The type of action (create or update)
	 * @returns The transformed data
	 */
	const transformInput = (
		data: Record<string, unknown>,
		model: string,
		action: 'create' | 'update'
	): Record<string, unknown> => {
		const modelSchema = schema[model];
		if (!modelSchema) {
			return data;
		}

		const result: Record<string, unknown> = {};

		// Apply field transformations
		for (const [key, value] of Object.entries(data)) {
			const fieldDef = modelSchema.fields?.[key];

			if (
				action === 'create' &&
				fieldDef?.defaultValue !== undefined &&
				value === undefined
			) {
				// Apply default value for create operations
				//@ts-expect-error
				result[key] = applyFieldDefaultValue(fieldDef.defaultValue, model, key);
			} else {
				result[key] = value;
			}
		}

		return result;
	};

	/**
	 * Transforms output data from database operations
	 *
	 * @param data - The output data
	 * @param model - The model name
	 * @param select - Optional fields to select
	 * @returns The transformed data
	 */
	const transformOutput = (
		data: Record<string, unknown>,
		model: string,
		select?: Array<string>
	): Record<string, unknown> => {
		if (!data) {
			return {};
		}

		// Apply field selection if needed
		if (select && select.length > 0) {
			const filtered: Record<string, unknown> = {};

			for (const field of select) {
				if (field in data) {
					filtered[field] = data[field];
				}
			}

			return filtered;
		}

		return data;
	};

	return {
		getEntityName,
		convertWhereClause,
		transformInput,
		transformOutput,
	};
};

/**
 * Creates a Kysely adapter using the Doubletie query-builder
 *
 * @param db - The Doubletie database instance
 * @param config - The Kysely adapter configuration
 * @returns The adapter factory function
 */
export const createKyselyAdapter =
	(
		db: DoubletieDatabase,
		config: KyselyConfig
	): ((options: CoreOptions) => Adapter) =>
	(options: CoreOptions): Adapter => {
		const transformer = createEntityTransformer(db, config, options);

		return {
			id: 'kysely',

			/**
			 * Creates a new record in the database
			 */
			async create<
				Model extends EntityName,
				Data extends Record<string, unknown>,
				Result extends Record<string, unknown>,
			>(data: {
				model: Model;
				data: Data;
				select?: Array<string>;
			}): Promise<Result> {
				const { model, data: inputData, select } = data;
				const entityName = transformer.getEntityName(model);
				const transformedData = transformer.transformInput(
					inputData,
					model,
					'create'
				);

				try {
					// Get the model from the Doubletie query-builder
					const modelInstance = db.getModel(entityName);

					// Use the model to create a record
					const result = await modelInstance.create(transformedData);

					return transformer.transformOutput(result, model, select) as Result;
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : 'Unknown error';
					throw new Error(`Failed to create ${model}: ${errorMessage}`);
				}
			},

			/**
			 * Finds a single record matching the where conditions
			 */
			async findOne<
				Model extends EntityName,
				Result extends Record<string, unknown>,
			>(data: {
				model: Model;
				where: Where<Model>;
				select?: Array<string>;
				sortBy?: SortOptions<Model>;
			}): Promise<Result | null> {
				const { model, where, select, sortBy } = data;
				const entityName = transformer.getEntityName(model);

				try {
					// Get the model from the Doubletie query-builder
					const modelInstance = db.getModel(entityName);

					// Start building the query
					let query = modelInstance.selectFrom();

					// Apply where clauses
					query = transformer.convertWhereClause(model, where)(query);

					// Apply sort if provided
					if (sortBy) {
						const direction = sortBy.direction === 'asc' ? 'asc' : 'desc';
						query = query.orderBy(sortBy.field, direction);
					}

					// Apply select if provided
					if (select && select.length > 0) {
						query = query.select(select);
					} else {
						query = query.selectAll();
					}

					// Get the first result
					const result = await query.executeTakeFirst();

					if (!result) return null;

					return transformer.transformOutput(result, model, select) as Result;
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : 'Unknown error';
					throw new Error(`Failed to find ${model}: ${errorMessage}`);
				}
			},

			/**
			 * Finds multiple records matching the where conditions
			 */
			async findMany<
				Model extends EntityName,
				Result extends Record<string, unknown>,
			>(data: {
				model: Model;
				where?: Where<Model>;
				limit?: number;
				sortBy?: SortOptions<Model>;
				offset?: number;
			}): Promise<Result[]> {
				const { model, where, limit, sortBy, offset } = data;
				const entityName = transformer.getEntityName(model);

				try {
					// Get the model from the Doubletie query-builder
					const modelInstance = db.getModel(entityName);

					// Start building the query
					let query = modelInstance.selectFrom();

					// Apply where clauses if provided
					if (where) {
						query = transformer.convertWhereClause(model, where)(query);
					}

					// Apply sort if provided
					if (sortBy) {
						const direction = sortBy.direction === 'asc' ? 'asc' : 'desc';
						query = query.orderBy(sortBy.field, direction);
					}

					// Apply limit if provided
					if (typeof limit === 'number') {
						query = query.limit(limit);
					}

					// Apply offset if provided
					if (typeof offset === 'number') {
						query = query.offset(offset);
					}

					// Select all columns
					query = query.selectAll();

					// Execute the query
					const results = await query.execute();

					// Transform the results
					return results.map(
						(result: Record<string, unknown>) =>
							transformer.transformOutput(result, model) as Result
					);
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : 'Unknown error';
					throw new Error(`Failed to find many ${model}: ${errorMessage}`);
				}
			},

			/**
			 * Counts records matching the where conditions
			 */
			async count<Model extends EntityName>(data: {
				model: Model;
				where?: Where<Model>;
			}): Promise<number> {
				const { model, where } = data;
				const entityName = transformer.getEntityName(model);

				try {
					// Get the model from the Doubletie query-builder
					const modelInstance = db.getModel(entityName);

					// Start building the query
					let query = modelInstance.selectFrom();

					// Apply where clauses if provided
					if (where) {
						query = transformer.convertWhereClause(model, where)(query);
					}

					// Count the records
					const result = await query.select(sql`count(*)`).executeTakeFirst();

					return Number(result?.count || 0);
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : 'Unknown error';
					throw new Error(`Failed to count ${model}: ${errorMessage}`);
				}
			},

			/**
			 * Updates a single record matching the where conditions
			 */
			async update<
				Model extends EntityName,
				Result extends Record<string, unknown>,
			>(data: {
				model: Model;
				where: Where<Model>;
				update: Record<string, unknown>;
			}): Promise<Result | null> {
				const { model, where, update: updateData } = data;
				const entityName = transformer.getEntityName(model);
				const transformedData = transformer.transformInput(
					updateData,
					model,
					'update'
				);

				try {
					// Get the model from the Doubletie query-builder
					const modelInstance = db.getModel(entityName);

					// First find the record to update
					let findQuery = modelInstance.selectFrom();
					findQuery = transformer.convertWhereClause(model, where)(findQuery);
					const existingRecord = await findQuery.selectAll().executeTakeFirst();

					if (!existingRecord) {
						return null;
					}

					// Start building the update query
					let updateQuery = modelInstance.updateTable();

					// Apply where clauses
					updateQuery = transformer.convertWhereClause(
						model,
						where
					)(updateQuery);

					// Set the values to update
					updateQuery = updateQuery.set(transformedData);

					// Execute the update and return the updated row
					await updateQuery.execute();

					// Fetch the updated record
					let resultQuery = modelInstance.selectFrom();
					resultQuery = transformer.convertWhereClause(
						model,
						where
					)(resultQuery);
					const result = await resultQuery.selectAll().executeTakeFirst();

					return transformer.transformOutput(result, model) as Result;
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : 'Unknown error';
					throw new Error(`Failed to update ${model}: ${errorMessage}`);
				}
			},

			/**
			 * Updates multiple records matching the where conditions
			 */
			async updateMany<
				Model extends EntityName,
				Result extends Record<string, unknown>,
			>(data: {
				model: Model;
				where: Where<Model>;
				update: Record<string, unknown>;
			}): Promise<Result[]> {
				const { model, where, update: updateData } = data;
				const entityName = transformer.getEntityName(model);
				const transformedData = transformer.transformInput(
					updateData,
					model,
					'update'
				);

				try {
					// Get the model from the Doubletie query-builder
					const modelInstance = db.getModel(entityName);

					// Start building the update query
					let updateQuery = modelInstance.updateTable();

					// Apply where clauses
					updateQuery = transformer.convertWhereClause(
						model,
						where
					)(updateQuery);

					// Set the values to update
					updateQuery = updateQuery.set(transformedData);

					// Execute the update
					await updateQuery.execute();

					// Fetch the updated records
					let resultQuery = modelInstance.selectFrom();
					resultQuery = transformer.convertWhereClause(
						model,
						where
					)(resultQuery);
					const results = await resultQuery.selectAll().execute();

					return results.map(
						(result: Record<string, unknown>) =>
							transformer.transformOutput(result, model) as Result
					);
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : 'Unknown error';
					throw new Error(`Failed to update many ${model}: ${errorMessage}`);
				}
			},

			/**
			 * Deletes a single record matching the where conditions
			 */
			async delete<Model extends EntityName>(data: {
				model: Model;
				where: Where<Model>;
			}): Promise<void> {
				const { model, where } = data;
				const entityName = transformer.getEntityName(model);

				try {
					// Get the model from the Doubletie query-builder
					const modelInstance = db.getModel(entityName);

					// Start building the delete query
					let deleteQuery = modelInstance.deleteFrom();

					// Apply where clauses
					deleteQuery = transformer.convertWhereClause(
						model,
						where
					)(deleteQuery);

					// Execute the delete
					await deleteQuery.execute();
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : 'Unknown error';
					throw new Error(`Failed to delete ${model}: ${errorMessage}`);
				}
			},

			/**
			 * Deletes multiple records matching the where conditions
			 */
			async deleteMany<Model extends EntityName>(data: {
				model: Model;
				where: Where<Model>;
			}): Promise<number> {
				const { model, where } = data;
				const entityName = transformer.getEntityName(model);

				try {
					// Get the model from the Doubletie query-builder
					const modelInstance = db.getModel(entityName);

					// First, count the records to be deleted
					let countQuery = modelInstance.selectFrom();
					countQuery = transformer.convertWhereClause(model, where)(countQuery);
					const countResult = await countQuery
						.select(sql`count(*)`)
						.executeTakeFirst();
					const count = Number(countResult?.count || 0);

					// Start building the delete query
					let deleteQuery = modelInstance.deleteFrom();

					// Apply where clauses
					deleteQuery = transformer.convertWhereClause(
						model,
						where
					)(deleteQuery);

					// Execute the delete
					await deleteQuery.execute();

					return count;
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : 'Unknown error';
					throw new Error(`Failed to delete many ${model}: ${errorMessage}`);
				}
			},

			/**
			 * Executes a function within a transaction
			 */
			async transaction<ResultType>(data: {
				callback: (transactionAdapter: Adapter) => Promise<ResultType>;
			}): Promise<ResultType> {
				const { callback } = data;

				return await db.transaction(async (trx) => {
					// Create a temporary DB object with the transaction context
					const transactionDb = {
						...db,
						getModel: (modelName: string) => {
							const model = db.getModel(modelName);
							return {
								...model,
								// Override the necessary methods to use the transaction
								selectFrom: () => model.selectFrom().withTransaction(trx),
								updateTable: () => model.updateTable().withTransaction(trx),
								deleteFrom: () => model.deleteFrom().withTransaction(trx),
								create: (data: any) => model.create(data, { transaction: trx }),
							};
						},
					};

					// Create a new adapter that uses the transaction context
					const transactionAdapter = createKyselyAdapter(
						transactionDb,
						config
					)(options);

					// Execute the callback function with the transaction adapter
					return await callback(transactionAdapter);
				});
			},

			/**
			 * Creates a database schema definition
			 */
			async createSchema(
				options: CoreOptions,
				file?: string
			): Promise<AdapterSchemaCreation> {
				const schemaLines: string[] = [];

				// Add imports
				schemaLines.push("import { Kysely, sql } from 'kysely';");
				schemaLines.push('');

				// Add database interface
				schemaLines.push('export interface Database {');

				if (options.schema) {
					for (const [modelName, modelDefRaw] of Object.entries(
						options.schema
					)) {
						schemaLines.push(`  ${modelName}: {`);

						// Add field definitions
						const modelDef = modelDefRaw as {
							fields?: Record<string, unknown>;
						};
						if (modelDef.fields) {
							for (const [fieldName, fieldDefRaw] of Object.entries(
								modelDef.fields
							)) {
								const fieldDef = fieldDefRaw as Field;
								let fieldType = 'string';

								if (fieldDef.type === 'string') fieldType = 'string';
								else if (fieldDef.type === 'number') fieldType = 'number';
								else if (fieldDef.type === 'boolean') fieldType = 'boolean';
								else if (fieldDef.type === 'date') fieldType = 'Date';

								schemaLines.push(`    ${fieldName}: ${fieldType};`);
							}
						}

						schemaLines.push('  };');
					}
				}

				schemaLines.push('};');
				schemaLines.push('');

				return {
					code: schemaLines.join('\n'),
					path: file || './kysely-schema.ts',
					overwrite: true,
				};
			},

			// Adapter-specific configuration
			options: config,
		};
	};

/**
 * Pre-configured Kysely adapter factory function
 *
 * This is a helper function that provides a pre-configured
 * createKyselyAdapter function with default configuration.
 *
 * @example
 * ```typescript
 * import { kyselyAdapter } from '@doubletie/core';
 * import { createDatabase } from '@doubletie/query-builder';
 *
 * const db = createDatabase({...});
 *
 * const adapter = kyselyAdapter(db, {
 *   dialect: 'postgres',
 * });
 * ```
 */
export const kyselyAdapter = createKyselyAdapter;
