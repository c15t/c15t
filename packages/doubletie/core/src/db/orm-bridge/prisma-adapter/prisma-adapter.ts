import { CoreOptions, EntityName, Field } from '../core-types';
import type {
	Adapter,
	AdapterSchemaCreation,
	SortOptions,
	Where,
} from '../types';
import { applyFieldDefaultValue } from '../utils';

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
type PrismaClient = Record<string, any>;

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
		create: (data: Record<string, any>) => Promise<Record<string, any>>;
		findFirst: (
			data: Record<string, any>
		) => Promise<Record<string, any> | null>;
		findMany: (data: Record<string, any>) => Promise<Record<string, any>[]>;
		count: (data: Record<string, any>) => Promise<number>;
		update: (data: Record<string, any>) => Promise<Record<string, any>>;
		updateMany: (data: Record<string, any>) => Promise<{ count: number }>;
		delete: (data: Record<string, any>) => Promise<Record<string, any>>;
		deleteMany: (data: Record<string, any>) => Promise<{ count: number }>;
		[key: string]: any;
	};
	//@ts-expect-error
	$transaction: <T>(fn: () => Promise<T>) => Promise<T>;
}

/**
 * Creates entity transformation utilities for the Prisma adapter
 *
 * This function creates helper methods for converting between the generic
 * data format and Prisma's query format, handling field mapping,
 * value transformation, and query building.
 *
 * @internal This function is used internally by the prismaAdapter
 * @param config - The Prisma adapter configuration
 * @param options - The adapter options
 * @returns An object containing entity transformation utilities
 */
const createEntityTransformer = (
	config: PrismaConfig,
	options: CoreOptions
) => {
	const schema = options.schema || {};

	/**
	 * Gets the database field name for a model field
	 *
	 * @internal
	 * @param model - The model name
	 * @param field - The field name in the model
	 * @returns The corresponding field name in the database schema
	 */
	function getField(model: string, field: string): string {
		const modelSchema = schema[model];
		if (!modelSchema) return field;

		const fieldDef = modelSchema.fields?.[field];
		if (!fieldDef) return field;

		return fieldDef.field || field;
	}

	/**
	 * Converts a query operator to a Prisma operator
	 *
	 * @internal
	 * @param operator - The query operator
	 * @returns The corresponding Prisma operator
	 */
	function operatorToPrismaOperator(operator?: string): string {
		switch (operator) {
			case 'eq':
				return 'equals';
			case 'ne':
				return 'not';
			case 'gt':
				return 'gt';
			case 'gte':
				return 'gte';
			case 'lt':
				return 'lt';
			case 'lte':
				return 'lte';
			case 'in':
				return 'in';
			case 'contains':
				return 'contains';
			case 'starts_with':
				return 'startsWith';
			case 'ends_with':
				return 'endsWith';
			case 'ilike':
				return 'contains'; // Note: Prisma doesn't have ilike, using contains as fallback
			default:
				return 'equals';
		}
	}

	/**
	 * Gets the entity name for a model
	 *
	 * @internal
	 * @param model - The model name
	 * @returns The entity name in the Prisma client
	 */
	function getEntityName(model: string): string {
		const modelSchema = schema[model];
		if (!modelSchema) return model;

		return modelSchema.entity || model;
	}

	return {
		/**
		 * Transforms input data for a Prisma query
		 *
		 * @param data - The input data
		 * @param model - The model name
		 * @param action - The action type ('create' or 'update')
		 * @returns The transformed data for Prisma
		 */
		transformInput(
			data: Record<string, unknown>,
			model: string,
			action: 'create' | 'update'
		): Record<string, unknown> {
			const result: Record<string, unknown> = {};
			const modelSchema = schema[model];

			// If no schema, pass through unchanged
			if (!modelSchema || !modelSchema.fields) {
				return data;
			}

			// Apply field transformations
			for (const [field, value] of Object.entries(data)) {
				const fieldDef = modelSchema.fields[field] as Field | undefined;

				// Skip undefined fields that aren't in the schema
				if (!fieldDef) {
					result[field] = value;
					continue;
				}

				// Get the database field name
				const dbField = fieldDef.field || field;

				// Apply default value if needed
				const finalValue = applyFieldDefaultValue(
					value as any,
					fieldDef,
					action
				);

				result[dbField] = finalValue;
			}

			return result;
		},

		/**
		 * Transforms output data from a Prisma query
		 *
		 * @param data - The output data from Prisma
		 * @param model - The model name
		 * @param select - The fields to select
		 * @returns The transformed data
		 */
		transformOutput(
			data: Record<string, unknown>,
			model: string,
			select: string[] = []
		): Record<string, unknown> {
			if (!data) return data;

			const result: Record<string, unknown> = {};
			const modelSchema = schema[model];

			// If no schema, pass through unchanged
			if (!modelSchema || !modelSchema.fields) {
				return data;
			}

			// Map reversed field names and transform values
			for (const [dbField, value] of Object.entries(data)) {
				let found = false;

				// Find the original field name
				for (const [field, fieldDef] of Object.entries(modelSchema.fields)) {
					const mappedField = (fieldDef as Field).field || field;

					if (mappedField === dbField) {
						result[field] = value;
						found = true;
						break;
					}
				}

				// If no mapping found, use the original field
				if (!found) {
					result[dbField] = value;
				}
			}

			// If specific fields are requested, filter the result
			if (select.length > 0) {
				const filtered: Record<string, unknown> = {};

				for (const field of select) {
					if (field in result) {
						filtered[field] = result[field];
					}
				}

				return filtered;
			}

			return result;
		},

		/**
		 * Converts a where clause to a Prisma filter
		 *
		 * @param model - The model name
		 * @param where - The where conditions
		 * @returns The Prisma filter object
		 */
		convertWhereClause<EntityType extends EntityName>(
			model: EntityType,
			where?: Where<EntityType>
		): Record<string, unknown> {
			if (!where || where.length === 0) {
				return {};
			}

			const filter: Record<string, any> = {};
			const modelSchema = schema[model];

			// Process each condition
			for (const condition of where) {
				const { field, operator, value, connector } = condition;
				const dbField = modelSchema?.fields?.[field]?.field || field;
				const prismaOperator = operatorToPrismaOperator(operator);

				// Handle logical connectors (AND, OR)
				if (connector === 'OR' && Object.keys(filter).length > 0) {
					// If we already have conditions and this is an OR,
					// we need to restructure to use Prisma's OR
					const existingConditions = { ...filter };
					filter.OR = [
						existingConditions,
						{ [dbField]: { [prismaOperator]: value } },
					];
				} else {
					// For AND or first condition, just add to the filter
					filter[dbField] = { [prismaOperator]: value };
				}
			}

			return filter;
		},

		/**
		 * Converts sort options to a Prisma orderBy object
		 *
		 * @param model - The model name
		 * @param sortOptions - The sort options
		 * @returns The Prisma orderBy object
		 */
		convertSortOptions<EntityType extends EntityName>(
			model: EntityType,
			sortOptions?: SortOptions<EntityType>
		): Record<string, unknown> | undefined {
			if (!sortOptions) {
				return undefined;
			}

			const { field, direction } = sortOptions;
			const modelSchema = schema[model];
			const dbField = modelSchema?.fields?.[field]?.field || field;

			return { [dbField]: direction };
		},

		getEntityName,
	};
};

/**
 * Creates a Prisma adapter
 *
 * @param prisma - The Prisma client instance
 * @param config - The Prisma adapter configuration
 * @returns The adapter factory function
 */
export const createPrismaAdapter =
	(
		prisma: PrismaClient,
		config: PrismaConfig
	): ((options: CoreOptions) => Adapter) =>
	(options: CoreOptions): Adapter => {
		const transformer = createEntityTransformer(config, options);
		const prismaClient = prisma as unknown as PrismaClientInternal;

		// Verify that the Prisma client has the expected structure
		if (!prismaClient) {
			throw new Error('Invalid Prisma client provided');
		}

		return {
			id: 'prisma',

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

				const prismaOptions: Record<string, unknown> = {
					data: transformedData,
				};

				if (select && select.length > 0) {
					prismaOptions.select = select.reduce(
						(acc, field) => {
							acc[field] = true;
							return acc;
						},
						{} as Record<string, boolean>
					);
				}

				try {
					const result = await prismaClient[entityName]?.create(prismaOptions);
					if (!result) throw new Error(`Failed to create ${model}`);
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
				const prismaWhere = transformer.convertWhereClause(model, where);
				const prismaOrderBy = transformer.convertSortOptions(model, sortBy);

				const prismaOptions: Record<string, unknown> = {
					where: prismaWhere,
				};

				if (prismaOrderBy) {
					prismaOptions.orderBy = prismaOrderBy;
				}

				if (select && select.length > 0) {
					prismaOptions.select = select.reduce(
						(acc, field) => {
							acc[field] = true;
							return acc;
						},
						{} as Record<string, boolean>
					);
				}

				try {
					const result =
						await prismaClient[entityName]?.findFirst(prismaOptions);
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
				const prismaWhere = where
					? transformer.convertWhereClause(model, where)
					: {};
				const prismaOrderBy = transformer.convertSortOptions(model, sortBy);

				const prismaOptions: Record<string, unknown> = {
					where: prismaWhere,
				};

				if (prismaOrderBy) {
					prismaOptions.orderBy = prismaOrderBy;
				}

				if (typeof limit === 'number') {
					prismaOptions.take = limit;
				}

				if (typeof offset === 'number') {
					prismaOptions.skip = offset;
				}

				try {
					const results =
						await prismaClient[entityName]?.findMany(prismaOptions);
					return (
						results?.map(
							(result) => transformer.transformOutput(result, model) as Result
						) || []
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
				const prismaWhere = where
					? transformer.convertWhereClause(model, where)
					: {};
				try {
					const count =
						(await prismaClient[entityName]?.count({
							where: prismaWhere,
						})) ?? 0;
					return count;
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
				const prismaWhere = transformer.convertWhereClause(model, where);
				const transformedData = transformer.transformInput(
					updateData,
					model,
					'update'
				);

				try {
					const result = await prismaClient[entityName]?.update({
						where: prismaWhere,
						data: transformedData,
					});
					if (!result) return null;
					return transformer.transformOutput(result, model) as Result;
				} catch (error) {
					// If record not found, return null instead of throwing
					if (
						error &&
						typeof error === 'object' &&
						'code' in error &&
						error.code === 'P2025'
					) {
						return null;
					}
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
				const prismaWhere = transformer.convertWhereClause(model, where);
				const transformedData = transformer.transformInput(
					updateData,
					model,
					'update'
				);

				try {
					// Execute updateMany and then fetch the updated records
					await prismaClient[entityName]?.updateMany({
						where: prismaWhere,
						data: transformedData,
					});

					// Fetch the updated records to return them
					const updatedRecords = await prismaClient[entityName]?.findMany({
						where: prismaWhere,
					});

					return (
						updatedRecords?.map(
							(record) => transformer.transformOutput(record, model) as Result
						) || []
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
				const prismaWhere = transformer.convertWhereClause(model, where);

				try {
					await prismaClient[entityName]?.delete({
						where: prismaWhere,
					});
				} catch (error) {
					// If record not found, don't throw
					if (
						error &&
						typeof error === 'object' &&
						'code' in error &&
						error.code === 'P2025'
					) {
						return;
					}
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
				const prismaWhere = transformer.convertWhereClause(model, where);

				try {
					const result = await prismaClient[entityName]?.deleteMany({
						where: prismaWhere,
					});

					return result?.count ?? 0;
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

				return await prismaClient.$transaction(async () => {
					// Create a new adapter that uses the same client but indicates it's in a transaction
					const transactionAdapter: Adapter = {
						...this,
						id: `${this.id}:transaction`,
					};

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
				// This is a simplified implementation - in a real adapter,
				// this would generate a complete Prisma schema
				const schemaDefinition = [
					'generator client {',
					'  provider = "prisma-client-js"',
					'}',
					'',
					`datasource db {`,
					`  provider = "${config.provider}"`,
					`  url      = env("DATABASE_URL")`,
					`}`,
					'',
				];

				// Add model definitions based on schema
				if (options.schema) {
					for (const [modelName, modelDefRaw] of Object.entries(
						options.schema
					)) {
						schemaDefinition.push(`model ${modelName} {`);

						// Add field definitions
						const modelDef = modelDefRaw as {
							fields?: Record<string, unknown>;
						};
						if (modelDef.fields) {
							for (const [fieldName, fieldDefRaw] of Object.entries(
								modelDef.fields
							)) {
								const fieldDef = fieldDefRaw as Field;
								let fieldType = 'String';

								if (fieldDef.type === 'string') fieldType = 'String';
								else if (fieldDef.type === 'number') fieldType = 'Int';
								else if (fieldDef.type === 'boolean') fieldType = 'Boolean';
								else if (fieldDef.type === 'date') fieldType = 'DateTime';

								const isId = fieldName === 'id' || fieldDef.primary;
								const idDecorator = isId ? ' @id' : '';
								const defaultValue = fieldDef.defaultValue
									? ` @default(${JSON.stringify(fieldDef.defaultValue)})`
									: '';

								schemaDefinition.push(
									`  ${fieldName} ${fieldType}${idDecorator}${defaultValue}`
								);
							}
						}

						schemaDefinition.push('}');
						schemaDefinition.push('');
					}
				}

				return {
					code: schemaDefinition.join('\n'),
					path: file || './prisma/schema.prisma',
					overwrite: true,
				};
			},

			// Adapter-specific configuration
			options: config,
		};
	};

// Export a helper function to make it easier to use
export function prismaAdapter(
	prisma: PrismaClient,
	config: PrismaConfig
): (options: CoreOptions) => Adapter {
	return createPrismaAdapter(prisma, config);
}
