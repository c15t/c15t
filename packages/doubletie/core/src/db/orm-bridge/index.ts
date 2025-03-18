import { OrmBridgeAdapter } from './adapter-bridge';
import { CoreOptions, DBSchema } from './core-types';
/**
 * ORM Bridge module
 *
 * This module provides bridge adapters to various ORMs and query builders
 * like Prisma, Drizzle, Kysely, and an in-memory adapter.
 */
import type { Adapter, AdapterInstance } from './types';

// Export the types
export * from './types';
export * from './core-types';
export {
	OrmBridgeAdapter,
	type OrmBridgeAdapterConfig,
} from './adapter-bridge';

// Export the adapters
export { createPrismaAdapter, prismaAdapter } from './prisma-adapter';
export { createMemoryAdapter, memoryAdapter } from './memory-adapter';
export { createKyselyAdapter, kyselyAdapter } from './kysely-adapter';

/**
 * Definition for the types of ORM adapters we support
 */
export type OrmAdapterType = 'prisma' | 'drizzle' | 'kysely' | 'memory';

/**
 * Extended configuration for database with ORM-specific properties
 */
export interface OrmDatabaseConfig {
	/** Type of adapter to use */
	adapter?: OrmAdapterType;
	/** Database connection options */
	connection?: any;
	/** Database schema */
	schema?: DBSchema;
	/** Additional options specific to the adapter */
	options?: Record<string, any>;
}

/**
 * Factory map for creating adapters
 */
const adapterFactories: Record<string, () => any> = {
	prisma: () => {
		try {
			const { prismaAdapter } = require('./prisma-adapter');
			return prismaAdapter;
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`Failed to load Prisma adapter: ${errorMessage}`);
		}
	},
	drizzle: () => {
		try {
			const { drizzleAdapter } = require('./drizzle-adapter');
			return drizzleAdapter;
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`Failed to load Drizzle adapter: ${errorMessage}`);
		}
	},
	kysely: () => {
		try {
			const { kyselyAdapter } = require('./kysely-adapter');
			return kyselyAdapter;
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`Failed to load Kysely adapter: ${errorMessage}`);
		}
	},
	memory: () => {
		try {
			const { memoryAdapter } = require('./memory-adapter');
			return memoryAdapter;
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`Failed to load Memory adapter: ${errorMessage}`);
		}
	},
};

/**
 * Create an ORM adapter based on the specified type
 */
export function createAdapter(
	type: OrmAdapterType,
	client: any,
	adapterOptions: any,
	options: CoreOptions
): OrmBridgeAdapter {
	const factoryGetter = adapterFactories[type];

	if (!factoryGetter) {
		throw new Error(`Unknown adapter type: ${type}`);
	}

	try {
		// Get the adapter factory
		const adapterFactory = factoryGetter();

		// Create the specific adapter with the client and options
		const adapter = adapterFactory(client, adapterOptions)(options);

		// Wrap it with the bridge adapter
		return new OrmBridgeAdapter({
			adapter,
			defaultPageSize: options.config?.defaultPageSize || 10,
		});
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		throw new Error(`Failed to create ${type} adapter: ${errorMessage}`);
	}
}

/**
 * Initialize an ORM adapter based on configuration
 */
export function initializeOrmAdapter(
	config: OrmDatabaseConfig,
	clients: Record<string, any>
): OrmBridgeAdapter | null {
	const adapterType = config.adapter || 'memory';

	if (!clients[adapterType]) {
		throw new Error(`Client for adapter type '${adapterType}' not provided`);
	}

	const options: CoreOptions = {
		entities: {},
		config: {
			...config.options,
			connection: config.connection,
		},
	};

	if (config.schema) {
		options.schema = config.schema;
	}

	return createAdapter(
		adapterType as OrmAdapterType,
		clients[adapterType],
		config.options || {},
		options
	);
}
