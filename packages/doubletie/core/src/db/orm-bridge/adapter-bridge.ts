import { CoreOptions, EntityInput, EntityName } from './core-types';
import type {
	Adapter,
	AdapterSchemaCreation,
	SortOptions,
	Where,
} from './types';
import { convertWhereToFilter, mapSortOptions } from './utils';

/**
 * Configuration for an ORM Bridge Adapter
 */
export interface OrmBridgeAdapterConfig {
	/** Database adapter instance */
	adapter: Adapter;
	/** Default page size for paginated queries */
	defaultPageSize?: number;
}

/**
 * OrmBridgeAdapter provides a wrapper around a specific ORM adapter to
 * connect it to a simpler, more unified interface
 */
export class OrmBridgeAdapter {
	adapter: Adapter;
	defaultPageSize: number;

	constructor(config: OrmBridgeAdapterConfig) {
		this.adapter = config.adapter;
		this.defaultPageSize = config.defaultPageSize || 10;
	}

	/**
	 * Create a new entity in the database
	 */
	async create<T extends EntityName>(
		entityName: T,
		data: EntityInput<T>
	): Promise<Record<string, unknown>> {
		return await this.adapter.create({
			model: entityName,
			data: data as any,
		});
	}

	/**
	 * Find a single entity by ID
	 */
	async findById<T extends EntityName>(
		entityName: T,
		id: string
	): Promise<Record<string, unknown> | null> {
		return await this.adapter.findOne({
			model: entityName,
			where: [{ field: 'id', value: id, operator: 'eq' }],
		});
	}

	/**
	 * Find all entities matching the specified filter
	 */
	async findAll<T extends EntityName>(
		entityName: T,
		options: {
			filter?: Record<string, any>;
			sort?: Record<string, 'asc' | 'desc'>;
			limit?: number;
			skip?: number;
		} = {}
	): Promise<Record<string, unknown>[]> {
		const {
			filter = {},
			sort = {},
			limit = this.defaultPageSize,
			skip = 0,
		} = options;

		const whereCondition = filter ? convertWhereToFilter(filter) : [];
		const sortOptions = sort ? mapSortOptions(entityName, sort) : undefined;

		return await this.adapter.findMany({
			model: entityName,
			where: whereCondition,
			sortBy: sortOptions,
			limit,
			offset: skip,
		});
	}

	/**
	 * Find a single entity matching the specified filter
	 */
	async findOne<T extends EntityName>(
		entityName: T,
		filter: Record<string, any> = {}
	): Promise<Record<string, unknown> | null> {
		const whereCondition = filter ? convertWhereToFilter(filter) : [];

		return await this.adapter.findOne({
			model: entityName,
			where: whereCondition,
		});
	}

	/**
	 * Count entities matching the specified filter
	 */
	async count<T extends EntityName>(
		entityName: T,
		filter: Record<string, any> = {}
	): Promise<number> {
		const whereCondition = filter ? convertWhereToFilter(filter) : [];

		return await this.adapter.count({
			model: entityName,
			where: whereCondition,
		});
	}

	/**
	 * Update an entity by ID
	 */
	async updateById<T extends EntityName>(
		entityName: T,
		id: string,
		data: EntityInput<T>
	): Promise<Record<string, unknown> | null> {
		return await this.adapter.update({
			model: entityName,
			where: [{ field: 'id', value: id, operator: 'eq' }],
			update: data as any,
		});
	}

	/**
	 * Update multiple entities matching the specified filter
	 */
	async updateMany<T extends EntityName>(
		entityName: T,
		filter: Record<string, any>,
		data: EntityInput<T>
	): Promise<Record<string, unknown>[]> {
		const whereCondition = filter ? convertWhereToFilter(filter) : [];

		return await this.adapter.updateMany({
			model: entityName,
			where: whereCondition,
			update: data as any,
		});
	}

	/**
	 * Delete an entity by ID
	 */
	async deleteById<T extends EntityName>(
		entityName: T,
		id: string
	): Promise<void> {
		await this.adapter.delete({
			model: entityName,
			where: [{ field: 'id', value: id, operator: 'eq' }],
		});
	}

	/**
	 * Delete multiple entities matching the specified filter
	 */
	async deleteMany<T extends EntityName>(
		entityName: T,
		filter: Record<string, any>
	): Promise<number> {
		const whereCondition = filter ? convertWhereToFilter(filter) : [];

		return await this.adapter.deleteMany({
			model: entityName,
			where: whereCondition,
		});
	}

	/**
	 * Execute a function within a transaction
	 */
	async transaction<T>(
		callback: (transaction: OrmBridgeAdapter) => Promise<T>
	): Promise<T> {
		return await this.adapter.transaction({
			callback: async (transactionAdapter) => {
				// Create a transaction bridge adapter
				const transactionBridge = new OrmBridgeAdapter({
					adapter: transactionAdapter,
					defaultPageSize: this.defaultPageSize,
				});

				// Execute the callback with the transaction bridge
				return await callback(transactionBridge);
			},
		});
	}

	/**
	 * Initialize the adapter
	 */
	async initialize(options: CoreOptions): Promise<void> {
		// No-op if the underlying adapter doesn't need initialization
	}

	/**
	 * Generate schema for the database
	 */
	async generateSchema(
		options: CoreOptions,
		file?: string
	): Promise<AdapterSchemaCreation | null> {
		if (this.adapter.createSchema) {
			return await this.adapter.createSchema(options, file);
		}
		return null;
	}
}
