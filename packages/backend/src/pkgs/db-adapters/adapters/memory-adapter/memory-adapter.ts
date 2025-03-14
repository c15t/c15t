import type {
	EntityInput,
	EntityName,
	EntityOutput,
	EntityTypeMap,
} from '~/pkgs/data-model/schema/types';
import type { C15TOptions } from '~/types';
import { getConsentTables } from '../../schema';

import {
	type Field,
	type Primitive,
	generateId,
} from '~/pkgs/data-model/fields';

import type { Adapter, TableFields, Where } from '../../types';
import { applyDefaultValue } from '../../utils';

/**
 * In-memory database structure for the memory adapter
 *
 * This interface defines the structure of the in-memory database used by the
 * memory adapter. It's a simple key-value store where each key represents a
 * collection/table name, and the value is an array of records.
 *
 * @example
 * ```typescript
 * const db: MemoryDB = {
 *   consent: [
 *     { id: 'cns_0i1dv2gasuubm7xlm2qj', subjectId: 'sub_x1pftyoufsm7xgo1kv', purposeId: 'pur_e8zyhgozr3im7xj59it', allowed: true },
 *     { id: 'cns_yxfwrgvn2bhm7xkjcsv', subjectId: 'sub_37lpazdq73qm7xiia1p', purposeId: 'pur_vv76m0rtb2dm7xj59gt', allowed: false }
 *   ],
 *   consentPurpose: [
 *     { id: 'pol_1116FRpKFncEvRmVbnJW6JhMxD', name: 'Marketing', description: 'For sending promotional materials' }
 *   ]
 * };
 * ```
 */
export interface MemoryDB {
	[key: string]: Record<string, unknown>[];
}
/**
 * Interface for where conditions in memory adapter queries
 *
 * This interface defines the structure of query conditions used
 * in database operations. It supports various operators and connectors
 * for building complex query conditions.
 *
 * @typeParam EntityType - The entity type being queried
 *
 * @example
 * ```typescript
 * // Simple equality condition
 * const whereCondition: WhereCondition<'consent'> = {
 *   field: 'subjectId',
 *   value: 'sub_x1pftyoufsm7xgo1kv'
 * };
 *
 * // More complex condition with operator
 * const complexCondition: WhereCondition<'consent'> = {
 *   field: 'purposeId',
 *   value: ['pur_uvrr67my07m7xj2bta', 'pur_e8zyhgozr3im7xj59it'],
 *   operator: 'in'
 * };
 *
 * // Using OR connector
 * const orCondition: WhereCondition<'consent'> = {
 *   field: 'purposeId',
 *   value: 'pur_e8zyhgozr3im7xj59it',
 *   connector: 'OR'  // Will match this OR the previous condition
 * };
 * ```
 */
interface WhereCondition<EntityType extends EntityName> {
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
		| 'contains'
		| 'starts_with'
		| 'ends_with'
		| '=';

	/**
	 * The logical connector to use with previous conditions.
	 * When set to 'OR', the condition will be combined with previous conditions using OR logic.
	 * When set to 'AND' or omitted, conditions will be combined using AND logic.
	 *
	 * @default "AND"
	 *
	 * @example
	 * ```typescript
	 * // Match records where purposeId is 'pur_e8zyhgozr3im7xj59it' OR subjectId is 'sub_x1pftyoufsm7xgo1kv'
	 * const where = [
	 *   { field: 'purposeId', value: 'pur_e8zyhgozr3im7xj59it' },
	 *   { field: 'subjectId', value: 'sub_x1pftyoufsm7xgo1kv', connector: 'OR' }
	 * ];
	 * ```
	 */
	connector?: 'AND' | 'OR';
}

/**
 * Creates entity transformation utilities for the memory adapter
 *
 * This function creates helper methods for converting between c15t's
 * data format and the in-memory format, handling field mapping,
 * value transformation, and query filtering.
 *
 * @internal This function is used internally by the memoryAdapter
 * @param options - The c15t options
 * @returns An object containing entity transformation utilities
 */
const createEntityTransformer = (options: C15TOptions) => {
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
	): string {
		if (field === 'id') {
			return field;
		}
		const modelFields = schema[model]?.fields;
		const f = modelFields
			? (modelFields as Record<string, Field>)[field as string]
			: undefined;
		return f?.fieldName || (field as string);
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
			action: 'update' | 'create'
		): Record<string, unknown> {
			const transformedData: Record<string, unknown> =
				action === 'update'
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
					const value = data[field as keyof typeof data];
					const fieldInfo = (fields as Record<string, Field>)[field];
					if (value === undefined && !fieldInfo?.defaultValue) {
						continue;
					}
					const fieldName = fieldInfo?.fieldName || field;
					transformedData[fieldName] = applyDefaultValue(
						value as Primitive,
						fieldInfo as Field,
						action
					);
				}
			}
			return transformedData;
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

			// Initialize with empty object
			const transformedData: Record<string, unknown> = {};

			// Handle ID separately
			const hasId = data.id || data._id;
			if (hasId && (select.length === 0 || select.includes('id'))) {
				transformedData.id = data.id;
			}

			const tableSchema = schema[model].fields;
			for (const key in tableSchema) {
				if (select.length && !select.includes(key)) {
					continue;
				}
				const field = (tableSchema as Record<string, Field>)[key];
				if (field) {
					transformedData[key] = data[field.fieldName || key];
				}
			}
			return transformedData as EntityOutput<EntityType>;
		},

		/**
		 * Filters records based on where conditions
		 *
		 * @internal
		 * @typeParam EntityType - The entity type
		 * @param where - Array of where conditions
		 * @param table - The table of records to filter
		 * @param model - The model name
		 * @returns Filtered array of records
		 * @throws {Error} When an invalid value is provided for 'in' operator
		 */
		convertWhereClause<EntityType extends EntityName>(
			where: WhereCondition<EntityType>[],
			table: Record<string, unknown>[],
			model: EntityType
		): Record<string, unknown>[] {
			return table.filter((record) => {
				return where.every((clause) => {
					const { field: _field, value, operator = '=' } = clause;
					const field = getField(model, _field);

					if (operator === 'in') {
						if (!Array.isArray(value)) {
							throw new Error('Value must be an array');
						}
						return value.includes(record[field]);
					}

					if (operator === 'contains') {
						const fieldValue = record[field];
						return (
							typeof fieldValue === 'string' &&
							fieldValue.includes(value as string)
						);
					}

					if (operator === 'starts_with') {
						const fieldValue = record[field];
						return (
							typeof fieldValue === 'string' &&
							fieldValue.startsWith(value as string)
						);
					}

					if (operator === 'ends_with') {
						const fieldValue = record[field];
						return (
							typeof fieldValue === 'string' &&
							fieldValue.endsWith(value as string)
						);
					}

					if (operator === 'eq') {
						return record[field] === value;
					}
					if (operator === 'ne') {
						return record[field] !== value;
					}

					// Default case (equals)
					return record[field] === value;
				});
			});
		},
		getField,
	};
};

/**
 * Creates a c15t adapter for in-memory storage
 *
 * This factory function creates an adapter that allows c15t to use in-memory
 * storage for development, testing, or simple production use cases where
 * persistence is not required.
 *
 * @param db - The in-memory database object
 * @returns A c15t adapter factory function
 *
 * @example
 * ```typescript
 * import { c15tInstance } from '@c15t/backend';
 * import { memoryAdapter } from '@c15t/adapters/memory';
 *
 * // Create an empty in-memory database
 * const db = {};
 *
 * // Create the c15t instance with memory adapter
 * const c15t = c15tInstance({
 *   storage: memoryAdapter(db),
 *   secret: process.env.SECRET_KEY
 * });
 *
 * // The database will be populated as records are created
 * // You can also inspect the database during development
 * console.log(db);
 * ```
 */
export const memoryAdapter =
	(db: MemoryDB) =>
	(options: C15TOptions): Adapter => {
		const { transformInput, transformOutput, convertWhereClause, getField } =
			createEntityTransformer(options);

		return {
			id: 'memory',
			/**
			 * Creates a new record in the in-memory database
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

				// Initialize array if it doesn't exist
				if (!db[model]) {
					db[model] = [];
				}

				db[model].push(transformed);
				return transformOutput(
					transformed,
					model,
					select as string[]
				) as Result;
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
				const table = db[model] || [];
				// Convert Where from Adapter type to internal WhereCondition type
				const whereArray = (Array.isArray(where)
					? where
					: [where]) as unknown as WhereCondition<Model>[];
				const res = convertWhereClause(whereArray, table, model);
				const record = res[0] || null;
				return transformOutput(
					record,
					model,
					select as string[]
				) as Result | null;
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
				const { model, where, sortBy, limit, offset } = data;
				let table = db[model] || [];

				if (where) {
					// Convert Where from Adapter type to internal WhereCondition type
					const whereArray = (Array.isArray(where)
						? where
						: [where]) as unknown as WhereCondition<Model>[];
					table = convertWhereClause(whereArray, table, model);
				}

				if (sortBy) {
					const field = getField(model, sortBy.field as string);
					table = [...table].sort((a, b) => {
						if (sortBy.direction === 'asc') {
							return (a[field] as number) > (b[field] as number) ? 1 : -1;
						}
						return (a[field] as number) < (b[field] as number) ? 1 : -1;
					});
				}

				let result = table;
				if (offset !== undefined) {
					result = result.slice(offset);
				}
				if (limit !== undefined) {
					result = result.slice(0, limit);
				}

				return result.map((record) => transformOutput(record, model) as Result);
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
				const table = db[model] || [];

				if (!where) {
					return table.length;
				}

				// Convert Where from Adapter type to internal WhereCondition type
				const whereArray = (Array.isArray(where)
					? where
					: [where]) as unknown as WhereCondition<Model>[];
				const filtered = convertWhereClause(whereArray, table, model);
				return filtered.length;
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
				const table = db[model] || [];
				// Convert Where from Adapter type to internal WhereCondition type
				const whereArray = (Array.isArray(where)
					? where
					: [where]) as unknown as WhereCondition<Model>[];
				const res = convertWhereClause(whereArray, table, model);

				for (const record of res) {
					Object.assign(
						record,
						transformInput(values as EntityInput<Model>, model, 'update')
					);
				}

				return transformOutput(res[0] || null, model) as Result | null;
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
				const table = db[model] || [];
				// Convert Where from Adapter type to internal WhereCondition type
				const whereArray = (Array.isArray(where)
					? where
					: [where]) as unknown as WhereCondition<Model>[];
				const res = convertWhereClause(whereArray, table, model);

				for (const record of res) {
					Object.assign(
						record,
						transformInput(values as EntityInput<Model>, model, 'update')
					);
				}

				return res.map((record) => transformOutput(record, model) as Result);
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
				const table = db[model] || [];
				// Convert Where from Adapter type to internal WhereCondition type
				const whereArray = (Array.isArray(where)
					? where
					: [where]) as unknown as WhereCondition<Model>[];
				const res = convertWhereClause(whereArray, table, model);
				db[model] = table.filter((record) => !res.includes(record));
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
				const table = db[model] || [];
				// Convert Where from Adapter type to internal WhereCondition type
				const whereArray = (Array.isArray(where)
					? where
					: [where]) as unknown as WhereCondition<Model>[];
				const res = convertWhereClause(whereArray, table, model);
				let count = 0;

				db[model] = table.filter((record) => {
					if (res.includes(record)) {
						count++;
						return false;
					}
					return true;
				});

				return count;
			},

			/**
			 * Executes a function within a memory-based transaction
			 *
			 * This method provides a simplified transaction mechanism for the in-memory
			 * database. It creates a deep copy of the current database state, performs
			 * operations on the copy, and then replaces the original database if successful.
			 *
			 * @typeParam ResultType - The type of data returned by the transaction
			 * @param data - The transaction data containing the callback function
			 * @returns A promise that resolves with the result of the callback function
			 * @throws {Error} If the transaction callback throws an error
			 */
			async transaction<ResultType>(data: {
				callback: (transactionAdapter: Adapter) => Promise<ResultType>;
			}): Promise<ResultType> {
				const { callback } = data;

				// Create a deep copy of the database for transaction isolation
				const tempDb: MemoryDB = {};
				for (const key in db) {
					if (Object.hasOwn(db, key)) {
						tempDb[key] = JSON.parse(JSON.stringify(db[key]));
					}
				}

				// Create a new adapter instance that uses the temporary database
				const transactionAdapter = memoryAdapter(tempDb)(options);

				// Execute the callback function with the transaction adapter
				const result = await callback(transactionAdapter);

				// If successful, commit changes by replacing the original database
				for (const key in tempDb) {
					if (Object.hasOwn(tempDb, key)) {
						db[key] = tempDb[key] as Record<string, unknown>[];
					}
				}

				return result;
			},
		};
	};
