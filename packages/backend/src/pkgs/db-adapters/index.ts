/**
 * DB Adapters Package
 *
 * This package provides a collection of database adapters for different database engines.
 * It includes a common interface and type definitions that all adapters implement,
 * allowing for easy switching between different database backends.
 */

// Export the adapter factory
export { getAdapter } from './adapter-factory';
export { drizzleAdapter } from './adapters/drizzle-adapter';

// Export all adapters and related utilities
export { kyselyAdapter } from './adapters/kysely-adapter';
export { createKyselyAdapter } from './adapters/kysely-adapter/dialect';
export { memoryAdapter } from './adapters/memory-adapter';
export { prismaAdapter } from './adapters/prisma-adapter';
// Export core types and utilities
export type {
	Adapter,
	AdapterInstance,
	AdapterSchemaCreation,
	KyselyAdapterConfig,
	TableFields,
	Where,
	WhereCondition,
} from './types';
export { applyDefaultValue } from './utils';
