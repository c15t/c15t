/**
 * Schema Generation Module
 *
 * This module handles the generation and processing of database schemas
 * based on the c15t configuration. It transforms table definitions into
 * a structured schema representation that can be used for database operations.
 *
 * Example usage:
 * ```typescript
 * import { getSchema } from '~/pkgs/migration/get-schema';
 * import type { SchemaDefinition } from '~/pkgs/migration/get-schema';
 *
 * // Get schema based on configuration
 * const schema: SchemaDefinition = getSchema(config);
 * ```
 */
export { getSchema } from './get-schema';
export { processFields } from './process-fields';
export { processTablesIntoSchema } from './process-tables';
export type { SchemaDefinition, TableSchemaDefinition } from './types';
