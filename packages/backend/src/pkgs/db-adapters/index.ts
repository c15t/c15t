/**
 * DB Adapters Package
 *
 * This package provides a collection of database adapters for different database engines.
 * It includes a common interface and type definitions that all adapters implement,
 * allowing for easy switching between different database backends.
 */

// Export core types and utilities
export * from './types';
export * from './utils';
export * from './schema';

// Export all adapters and related utilities
export { kyselyAdapter } from './adapters/kysely-adapter';
export { prismaAdapter } from './adapters/prisma-adapter';
export { memoryAdapter } from './adapters/memory-adapter';
export { drizzleAdapter } from './adapters/drizzle-adapter';
export { createKyselyAdapter } from './adapters/kysely-adapter/dialect';
