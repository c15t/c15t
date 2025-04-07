//@ts-nocheck
import { DoubleTieError, ERROR_CODES } from '~/pkgs/results';
import type { C15TOptions } from '~/types';

import { type EntityName, generateId } from '~/pkgs/data-model';
import { getConsentTables } from '~/schema/definition';
import type { Adapter, Where } from '../../types';
import { applyDefaultValue } from '../../utils';

/**
 * Configuration options for the Prisma adapter
 *
 * This interface defines the configuration options for the Prisma adapter,
 * including which database provider to use.
 *
 * @example
 * ```typescript
 * const config: PrismaConfig = {
 *   provider: 'postgresql'
 * };
 * ```
 */
export interface PrismaConfig {
	/**
	 * Database provider.
	 *
	 * Specifies which database engine the Prisma client is configured to use.
	 * This affects how queries are constructed and executed.
	 */
	provider:
		| 'sqlite'
		| 'cockroachdb'
		| 'mysql'
		| 'postgresql'
		| 'sqlserver'
		| 'mongodb';
}

/**
 * Type alias for a Prisma client instance
 *
 * This represents a generic Prisma client that can be used with the adapter.
 * The actual shape will depend on your specific Prisma schema.
 */
type PrismaClient = Record<string, unknown>;

/**
 * Internal type representing the expected structure of a Prisma client
 *
 * This interface defines the expected methods and properties that the
 * adapter will use when interacting with the Prisma client.
 *
 * @internal
 */
interface PrismaClientInternal {
	[model: string]: {
		create: (data: data) => Promise<data>;
		findFirst: (data: data) => Promise<data>;
		findMany: (data: data) => Promise<data>;
		update: (data: data) => Promise<data>;
		delete: (data: data) => Promise<data>;
		[key: string]: data;
	};
}

/**
 * Type alias for generic data objects
 *
 * @internal
 */
type data = Record<string, unknown>;

/**
 * Creates entity transformation utilities for the Prisma adapter
 *
 * This function creates helper methods for converting between c15t's
 * data format and Prisma's query format, handling field mapping,
 * value transformation, and query building.
 *
 * @internal This function is used internally by the prismaAdapter
 * @param _config - The Prisma adapter configuration
 * @param options - The c15t options
 * @returns An object containing entity transformation utilities
 */
const createEntityTransformer = (
	_config: PrismaConfig,
	options: C15TOptions
) => {
	const schema = getConsentTables(options);

	/**
	 * Gets the database field name for a model field
	 *
	 * @internal
	 * @param model - The model name
	 * @param field - The field name in the c15t model
	 * @returns The corresponding field name in the database schema
	 */
	function getField(model: string, field: string) {
		if (field === 'id') {
			return field;
		}
		const f = schema[model].fields[field];
		return f.fieldName || field;
	}

	/**
	 * Converts c15t operators to Prisma operators
	 *
	 * @internal
	 * @param operator - The c15t operator
	 * @returns The equivalent Prisma operator
	 */
	function operatorToPrismaOperator(operator: string) {
		switch (operator) {
			case 'starts_with':
				return 'startsWith';
			case 'ends_with':
				return 'endsWith';
			default:
				return operator;
		}
	}

	/**
	 * Gets the database entity name for a model
	 *
	 * @internal
	 * @param model - The model name
	 * @returns The database table/collection name
	 */
	function getEntityName(model: string) {
		return schema[model].entityName;
	}

	const useDatabaseGeneratedId = options?.advanced?.generateId === false;
	return {
		/**
		 * Transforms input data from c15t format to Prisma format
		 *
		 * @internal
		 * @param data - The data to transform
		 * @param model - The model name
		 * @param action - Whether this is a create or update operation
		 * @returns Transformed data for Prisma operations
		 */
		transformInput(
			data: Record<string, unknown>,
			model: string,
			action: 'create' | 'update'
		) {
			const transformedData: Record<string, unknown> =
				useDatabaseGeneratedId || action === 'update'
					? {}
					: {
							id: options.advanced?.generateId
								? options.advanced.generateId({
										model,
									})
								: data.id || generateId(schema[model].entityPrefix),
						};
			const fields = schema[model].fields;
			for (const field in fields) {
				if (Object.hasOwn(fields, field)) {
					const value = data[field];
					if (
						value === undefined &&
						(!fields[field].defaultValue || action === 'update')
					) {
						continue;
					}
					transformedData[fields[field].fieldName || field] = applyDefaultValue(
						value,
						fields[field],
						action
					);
				}
			}
			return transformedData;
		},

		/**
		 * Transforms output data from Prisma format to c15t format
		 *
		 * @internal
		 * @param data - The data from Prisma
		 * @param model - The model name
		 * @param select - Optional array of fields to select
		 * @returns Transformed data for c15t or null if no data
		 */
		transformOutput(
			data: Record<string, unknown>,
			model: string,
			select: string[] = []
		) {
			if (!data) {
				return null;
			}

			let transformedData: Record<string, unknown> = {};

			if (
				(data.id || data._id) &&
				(select.length === 0 || select.includes('id'))
			) {
				transformedData = { id: data.id };
			}

			const tableSchema = schema[model].fields;
			for (const key in tableSchema) {
				if (select.length && !select.includes(key)) {
					continue;
				}
				const field = tableSchema[key];
				if (field) {
					transformedData[key] = data[field.fieldName || key];
				}
			}
			return transformedData as unknown;
		},

		/**
		 * Converts c15t where clauses to Prisma query conditions
		 *
		 * @internal
		 * @typeParam EntityType - The entity type
		 * @param model - The model name
		 * @param where - The where conditions
		 * @returns Prisma-compatible where clause object
		 */
		convertWhereClause<EntityType extends EntityName>(
			model: EntityType,
			where?: Where<EntityType>[]
		) {
			if (!where) {
				return {};
			}
			if (where.length === 1) {
				const w = where[0];
				if (!w) {
					return;
				}
				return {
					[getField(model as string, w.field as string)]:
						w.operator === 'eq' || !w.operator
							? w.value
							: {
									[operatorToPrismaOperator(w.operator)]: w.value,
								},
				};
			}
			const and = where.filter((w) => w.connector === 'AND' || !w.connector);
			const or = where.filter((w) => w.connector === 'OR');
			const andClause = and.map((w) => {
				return {
					[getField(model as string, w.field as string)]:
						w.operator === 'eq' || !w.operator
							? w.value
							: {
									[operatorToPrismaOperator(w.operator)]: w.value,
								},
				};
			});
			const orClause = or.map((w) => {
				return {
					[getField(model as string, w.field as string)]: {
						[w.operator || 'eq']: w.value,
					},
				};
			});

			return {
				...(andClause.length ? { AND: andClause } : {}),
				...(orClause.length ? { OR: orClause } : {}),
			};
		},

		/**
		 * Converts c15t select array to Prisma select object
		 *
		 * @internal
		 * @param select - Array of fields to select
		 * @param model - The model name
		 * @returns Prisma-compatible select object or undefined
		 */
		convertSelect: (select?: string[], model?: string) => {
			if (!select || !model) {
				return undefined;
			}
			return select.reduce((prev, cur) => {
				const field = getField(model, cur);
				return Object.assign({}, prev, { [field]: true });
			}, {});
		},
		getEntityName,
		getField,
	};
};

/**
 * Creates a c15t adapter for Prisma ORM
 *
 * This factory function creates an adapter that allows c15t to use Prisma ORM
 * as its database layer. It translates c15t operations into Prisma queries.
 *
 * @param prisma - The Prisma client instance
 * @param config - Configuration for the Prisma adapter
 * @returns A c15t adapter factory function
 *
 * @example
 * ```typescript
 * import { PrismaClient } from '@prisma/client';
 * import { c15tInstance } from '@c15t/backend';
 * import { prismaAdapter } from '@c15t/db/adapters/prisma';
 *
 * // Create a Prisma client
 * const prisma = new PrismaClient();
 *
 * // Create the c15t instance with Prisma adapter
 * const c15t = c15tInstance({
 *   storage: prismaAdapter(prisma, { provider: 'postgresql' }),
 *   secret: process.env.SECRET_KEY
 * });
 *
 * // Use in your application
 * export default c15tInstance.handler;
 * ```
 */
export const prismaAdapter =
	(prisma: PrismaClient, config: PrismaConfig) => (options: C15TOptions) => {
		const db = prisma as PrismaClientInternal;
		const {
			transformInput,
			transformOutput,
			convertWhereClause,
			convertSelect,
			getEntityName,
			getField,
		} = createEntityTransformer(config, options);
		return {
			id: 'prisma',
			/**
			 * Creates a new record in the database
			 *
			 * @param data - The data for the create operation
			 * @returns The created record
			 * @throws {DoubleTieError} When the model does not exist in the database
			 */
			async create(data) {
				const { model, data: values, select } = data;
				const transformed = transformInput(values, model, 'create');
				if (!db[getEntityName(model)]) {
					throw new DoubleTieError(
						`The model "${model}" does not exist in the Prisma client. Please verify the model name and ensure it is defined in your Prisma schema.`,
						{
							code: ERROR_CODES.DATABASE_QUERY_ERROR,
							status: 500,
							meta: {
								model,
								availableModels: Object.keys(prisma).filter(
									(key) => !key.startsWith('$') && !key.startsWith('_')
								),
							},
						}
					);
				}
				const result = await db[getEntityName(model)].create({
					data: transformed,
					select: convertSelect(select, model),
				});
				return transformOutput(result, model, select);
			},

			/**
			 * Finds a single record matching the where conditions
			 *
			 * @param data - The data for the find operation
			 * @returns The found record or null if not found
			 * @throws {DoubleTieError} When the model does not exist in the database
			 */
			async findOne(data) {
				const { model, where, select } = data;
				const whereClause = convertWhereClause(model, where);
				if (!db[getEntityName(model)]) {
					throw new DoubleTieError(
						`The model "${model}" does not exist in the Prisma client. Please verify the model name and ensure it is defined in your Prisma schema.`,
						{
							code: ERROR_CODES.DATABASE_QUERY_ERROR,
							status: 500,
							meta: {
								model,
								availableModels: Object.keys(prisma).filter(
									(key) => !key.startsWith('$') && !key.startsWith('_')
								),
							},
						}
					);
				}
				const result = await db[getEntityName(model)].findFirst({
					where: whereClause,
					select: convertSelect(select, model),
				});
				return transformOutput(result, model, select);
			},

			/**
			 * Finds multiple records matching the where conditions
			 *
			 * @param data - The data for the find operation
			 * @returns Array of matching records
			 * @throws {DoubleTieError} When the model does not exist in the database
			 */
			async findMany(data) {
				const { model, where, limit, offset, sortBy } = data;
				const whereClause = convertWhereClause(model, where);
				if (!db[getEntityName(model)]) {
					throw new DoubleTieError(
						`The model "${model}" does not exist in the Prisma client. Please verify the model name and ensure it is defined in your Prisma schema.`,
						{
							code: ERROR_CODES.DATABASE_QUERY_ERROR,
							status: 500,
							meta: {
								model,
								availableModels: Object.keys(prisma).filter(
									(key) => !key.startsWith('$') && !key.startsWith('_')
								),
							},
						}
					);
				}

				const result = (await db[getEntityName(model)].findMany({
					where: whereClause,
					take: limit || 100,
					skip: offset || 0,
					...(sortBy?.field
						? {
								orderBy: {
									[getField(model, sortBy.field)]:
										sortBy.direction === 'desc' ? 'desc' : 'asc',
								},
							}
						: {}),
				})) as unknown[];
				return result.map((r) => transformOutput(r, model));
			},

			/**
			 * Counts records matching the where conditions
			 *
			 * @param data - The data for the count operation
			 * @returns The count of matching records
			 * @throws {DoubleTieError} When the model does not exist in the database
			 */
			async count(data) {
				const { model, where } = data;
				const whereClause = convertWhereClause(model, where);
				if (!db[getEntityName(model)]) {
					throw new DoubleTieError(
						`The model "${model}" does not exist in the Prisma client. Please verify the model name and ensure it is defined in your Prisma schema.`,
						{
							code: ERROR_CODES.DATABASE_QUERY_ERROR,
							status: 500,
							meta: {
								model,
								availableModels: Object.keys(prisma).filter(
									(key) => !key.startsWith('$') && !key.startsWith('_')
								),
							},
						}
					);
				}
				const result = await db[getEntityName(model)].count({
					where: whereClause,
				});
				return result;
			},

			/**
			 * Updates a single record matching the where conditions
			 *
			 * @param data - The data for the update operation
			 * @returns The updated record or null if not found
			 * @throws {DoubleTieError} When the model does not exist in the database
			 */
			async update(data) {
				const { model, where, update } = data;
				const whereClause = convertWhereClause(model, where);
				const transformed = transformInput(update, model, 'update');
				try {
					const result = await db[getEntityName(model)].update({
						where: whereClause,
						data: transformed,
					});
					return transformOutput(result, model);
				} catch {
					// Prisma throws an error if no records match the where clause
					return null;
				}
			},

			/**
			 * Updates multiple records matching the where conditions
			 *
			 * @param data - The data for the update operation
			 * @returns The number of records updated
			 * @throws {DoubleTieError} When the model does not exist in the database
			 */
			async updateMany(data) {
				const { model, where, update } = data;
				const whereClause = convertWhereClause(model, where);
				const transformed = transformInput(update, model, 'update');
				const result = await db[getEntityName(model)].updateMany({
					where: whereClause,
					data: transformed,
				});
				return result ? (result.count as number) : 0;
			},

			/**
			 * Deletes a single record matching the where conditions
			 *
			 * @param data - The data for the delete operation
			 * @throws {DoubleTieError} When the model does not exist in the database (but catches and ignores if record not found)
			 */
			async delete(data) {
				const { model, where } = data;
				const whereClause = convertWhereClause(model, where);
				try {
					await db[getEntityName(model)].delete({
						where: whereClause,
					});
				} catch {
					// If the record doesn't exist, we don't want to throw an error
				}
			},

			/**
			 * Deletes multiple records matching the where conditions
			 *
			 * @param data - The data for the delete operation
			 * @returns The number of records deleted
			 * @throws {DoubleTieError} When the model does not exist in the database
			 */
			async deleteMany(data) {
				const { model, where } = data;
				const whereClause = convertWhereClause(model, where);
				const result = await db[getEntityName(model)].deleteMany({
					where: whereClause,
				});
				return result ? (result.count as number) : 0;
			},

			/**
			 * Executes a function within a database transaction
			 *
			 * This method wraps Prisma's transaction functionality to provide a consistent interface
			 * for executing multiple database operations atomically.
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

				return db.$transaction(async (tx) => {
					// Create a prisma client instance that uses the transaction context
					const txClient = tx as unknown as PrismaClient;

					// Create a new adapter instance that uses the transaction client
					const transactionAdapter = prismaAdapter(txClient, config)(options);

					// Execute the callback function with the transaction adapter
					return await callback(transactionAdapter);
				});
			},

			options: config,
		};
	};
