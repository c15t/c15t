import { CoreOptions, EntityName, generateId } from '../core-types';
import type {
	Adapter,
	AdapterSchemaCreation,
	SortOptions,
	Where,
} from '../types';
import { createTemplateAdapter } from '../utils';

/**
 * Configuration for the Memory adapter
 */
export interface MemoryAdapterConfig {
	/** Whether to persist data between operations */
	persist?: boolean;
	/** Initial data to populate the in-memory database with */
	initialData?: Record<string, any[]>;
}

/**
 * In-memory database store
 */
class MemoryStore {
	private data: Record<string, Record<string, any>[]> = {};

	constructor(initialData?: Record<string, any[]>) {
		if (initialData) {
			// Populate initial data
			for (const [model, items] of Object.entries(initialData)) {
				this.data[model] = items.map((item) => ({ ...item }));
			}
		}
	}

	/**
	 * Get all records for a model
	 */
	getAll(model: string): Record<string, any>[] {
		return this.data[model] || [];
	}

	/**
	 * Insert a record
	 */
	insert(model: string, record: Record<string, any>): Record<string, any> {
		if (!this.data[model]) {
			this.data[model] = [];
		}

		// Ensure record has an ID
		const finalRecord = { ...record };
		if (!finalRecord.id) {
			finalRecord.id = generateId();
		}

		this.data[model].push(finalRecord);
		return { ...finalRecord };
	}

	/**
	 * Update a record
	 */
	update(
		model: string,
		id: string,
		data: Record<string, any>
	): Record<string, any> | null {
		const records = this.data[model] || [];
		const index = records.findIndex((r) => r.id === id);

		if (index === -1) {
			return null;
		}

		const updatedRecord = { ...records[index], ...data };
		records[index] = updatedRecord;

		return { ...updatedRecord };
	}

	/**
	 * Delete a record
	 */
	delete(model: string, id: string): boolean {
		const records = this.data[model] || [];
		const index = records.findIndex((r) => r.id === id);

		if (index === -1) {
			return false;
		}

		records.splice(index, 1);
		return true;
	}

	/**
	 * Find records by filter
	 */
	find(
		model: string,
		filter: (record: Record<string, any>) => boolean,
		options?: {
			limit?: number;
			offset?: number;
			sort?: (a: Record<string, any>, b: Record<string, any>) => number;
		}
	): Record<string, any>[] {
		const records = this.data[model] || [];
		let results = records.filter(filter);

		// Apply sorting
		if (options?.sort) {
			results = results.sort(options.sort);
		}

		// Apply pagination
		if (options?.offset !== undefined || options?.limit !== undefined) {
			const offset = options.offset || 0;
			const limit =
				options.limit !== undefined ? options.limit : results.length;

			results = results.slice(offset, offset + limit);
		}

		// Return copy of results to prevent modifications
		return results.map((r) => ({ ...r }));
	}

	/**
	 * Count records by filter
	 */
	count(
		model: string,
		filter: (record: Record<string, any>) => boolean
	): number {
		const records = this.data[model] || [];
		return records.filter(filter).length;
	}

	/**
	 * Clear all data
	 */
	clear(): void {
		this.data = {};
	}

	/**
	 * Get a snapshot of the current data
	 */
	snapshot(): Record<string, Record<string, any>[]> {
		const result: Record<string, Record<string, any>[]> = {};

		for (const [model, records] of Object.entries(this.data)) {
			result[model] = records.map((r) => ({ ...r }));
		}

		return result;
	}
}

/**
 * Create a filter function from a where clause
 */
function createFilterFromWhere(
	where: Where<any>
): (record: Record<string, any>) => boolean {
	return (record) => {
		if (!where || where.length === 0) {
			return true;
		}

		// Process AND conditions
		const andConditions = where.filter(
			(w) => !w.connector || w.connector === 'AND'
		);
		const orConditions = where.filter((w) => w.connector === 'OR');

		// If any AND condition fails, the record doesn't match
		for (const condition of andConditions) {
			const { field, operator, value } = condition;
			const recordValue = record[field];

			if (!matchesCondition(recordValue, value, operator)) {
				return false;
			}
		}

		// If we have OR conditions and no AND conditions failed, check if any OR condition matches
		if (orConditions.length > 0) {
			for (const condition of orConditions) {
				const { field, operator, value } = condition;
				const recordValue = record[field];

				if (matchesCondition(recordValue, value, operator)) {
					return true;
				}
			}

			// If we got here, no OR condition matched
			return false;
		}

		// If we got here, all AND conditions matched and there were no OR conditions
		return true;
	};
}

/**
 * Check if a value matches a condition
 */
function matchesCondition(
	recordValue: any,
	conditionValue: any,
	operator?: string
): boolean {
	switch (operator) {
		case 'eq':
			return recordValue === conditionValue;
		case 'ne':
			return recordValue !== conditionValue;
		case 'gt':
			return recordValue > conditionValue;
		case 'gte':
			return recordValue >= conditionValue;
		case 'lt':
			return recordValue < conditionValue;
		case 'lte':
			return recordValue <= conditionValue;
		case 'in':
			return (
				Array.isArray(conditionValue) && conditionValue.includes(recordValue)
			);
		case 'contains':
			return (
				typeof recordValue === 'string' && recordValue.includes(conditionValue)
			);
		case 'starts_with':
			return (
				typeof recordValue === 'string' &&
				recordValue.startsWith(conditionValue)
			);
		case 'ends_with':
			return (
				typeof recordValue === 'string' && recordValue.endsWith(conditionValue)
			);
		case 'ilike':
			return (
				typeof recordValue === 'string' &&
				typeof conditionValue === 'string' &&
				recordValue.toLowerCase().includes(conditionValue.toLowerCase())
			);
		default:
			return recordValue === conditionValue;
	}
}

/**
 * Create sort function from sort options
 */
function createSortFunction(
	sortOptions?: SortOptions<any>
): ((a: Record<string, any>, b: Record<string, any>) => number) | undefined {
	if (!sortOptions) {
		return undefined;
	}

	const { field, direction } = sortOptions;

	return (a, b) => {
		const aVal = a[field];
		const bVal = b[field];

		if (aVal === bVal) return 0;

		const comparison = aVal < bVal ? -1 : 1;
		return direction === 'asc' ? comparison : -comparison;
	};
}

/**
 * Create a memory adapter
 *
 * @param config - Configuration for the memory adapter
 * @returns The adapter factory function
 */
export const createMemoryAdapter =
	(config: MemoryAdapterConfig = {}): ((options: CoreOptions) => Adapter) =>
	(options: CoreOptions): Adapter => {
		// Create shared store (shared across all instances)
		const store = new MemoryStore(config.initialData);

		return {
			id: 'memory',

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
				const result = store.insert(model, inputData as Record<string, any>);

				// Apply field selection if needed
				if (select && select.length > 0) {
					const filtered: Record<string, any> = {};

					for (const field of select) {
						if (field in result) {
							filtered[field] = result[field];
						}
					}

					return filtered as Result;
				}

				return result as Result;
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
				const filter = createFilterFromWhere(where);
				const sort = createSortFunction(sortBy);

				const results = store.find(model, filter, { limit: 1, sort });

				if (results.length === 0) {
					return null;
				}

				const result = results[0];

				// Apply field selection if needed
				if (select && select.length > 0 && result) {
					const filtered: Record<string, any> = {};

					for (const field of select) {
						if (field in result) {
							filtered[field] = result[field];
						}
					}

					return filtered as Result;
				}

				return result as Result;
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
				const filter = where ? createFilterFromWhere(where) : () => true;
				const sort = createSortFunction(sortBy);

				const results = store.find(model, filter, { limit, offset, sort });

				return results as Result[];
			},

			/**
			 * Counts records matching the where conditions
			 */
			async count<Model extends EntityName>(data: {
				model: Model;
				where?: Where<Model>;
			}): Promise<number> {
				const { model, where } = data;
				const filter = where ? createFilterFromWhere(where) : () => true;

				return store.count(model, filter);
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

				// Find the record to update
				const record = await this.findOne({ model, where });

				if (!record) {
					return null;
				}

				// Update the record
				return store.update(
					model,
					record.id as string,
					updateData as Record<string, any>
				) as Result;
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

				// Find all records to update
				const records = await this.findMany({ model, where });
				const results: Result[] = [];

				// Update each record
				for (const record of records) {
					const updated = store.update(
						model,
						record.id as string,
						updateData as Record<string, any>
					);

					if (updated) {
						results.push(updated as Result);
					}
				}

				return results;
			},

			/**
			 * Deletes a single record matching the where conditions
			 */
			async delete<Model extends EntityName>(data: {
				model: Model;
				where: Where<Model>;
			}): Promise<void> {
				const { model, where } = data;

				// Find the record to delete
				const record = await this.findOne({ model, where });

				if (record) {
					store.delete(model, record.id as string);
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

				// Find all records to delete
				const records = await this.findMany({ model, where });
				let count = 0;

				// Delete each record
				for (const record of records) {
					const deleted = store.delete(model, record.id as string);

					if (deleted) {
						count++;
					}
				}

				return count;
			},

			/**
			 * Executes a function within a transaction
			 */
			async transaction<ResultType>(data: {
				callback: (transactionAdapter: Adapter) => Promise<ResultType>;
			}): Promise<ResultType> {
				const { callback } = data;

				// For memory adapter, we can just take a snapshot and rollback if needed
				const snapshot = store.snapshot();

				try {
					const result = await callback(this);
					return result;
				} catch (error) {
					// Rollback by clearing and restoring from snapshot
					store.clear();

					for (const [model, records] of Object.entries(snapshot)) {
						for (const record of records) {
							store.insert(model, record);
						}
					}

					throw error;
				}
			},

			/**
			 * Creates a database schema definition
			 */
			async createSchema(
				options: CoreOptions,
				file?: string
			): Promise<AdapterSchemaCreation> {
				// Generate a TypeScript interface schema for the memory adapter
				const schemaLines = ['/**', ' * In-memory database schema', ' */', ''];

				if (options.schema) {
					schemaLines.push('export interface MemorySchema {');

					for (const [modelName, modelDefRaw] of Object.entries(
						options.schema
					)) {
						schemaLines.push(`  ${modelName}: {`);

						const modelDef = modelDefRaw as {
							fields?: Record<string, unknown>;
						};
						if (modelDef.fields) {
							for (const [fieldName, fieldDefRaw] of Object.entries(
								modelDef.fields
							)) {
								const fieldDef = fieldDefRaw as { type?: string };
								let fieldType = 'string';

								if (fieldDef.type === 'string') fieldType = 'string';
								else if (fieldDef.type === 'number') fieldType = 'number';
								else if (fieldDef.type === 'boolean') fieldType = 'boolean';
								else if (fieldDef.type === 'date') fieldType = 'Date';

								schemaLines.push(`    ${fieldName}: ${fieldType};`);
							}
						}

						schemaLines.push('  }[];');
					}

					schemaLines.push('}');
				}

				return {
					code: schemaLines.join('\n'),
					path: file || './memory-schema.ts',
					overwrite: true,
				};
			},

			// Adapter-specific configuration
			options: config,
		};
	};

// Export a helper function to make it easier to use
export function memoryAdapter(
	config: MemoryAdapterConfig = {}
): (options: CoreOptions) => Adapter {
	return createMemoryAdapter(config);
}
