/**
 * Kysely Adapter for the ORM Bridge
 *
 * This module provides integration between the ORM Bridge and Kysely through
 * the Doubletie query-builder.
 */

// Export the main adapter functions
export { createKyselyAdapter, kyselyAdapter } from './kysely-adapter';

// Export types
export type { KyselyConfig } from './kysely-adapter';
