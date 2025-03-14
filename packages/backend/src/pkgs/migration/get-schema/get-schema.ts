import { getConsentTables } from '~/db/schema/definition';
import type { C15TOptions } from '~/pkgs/types';
import { processTablesIntoSchema } from './process-tables';
import type { SchemaDefinition } from './types';

/**
 * Generates a complete database schema from the C15T configuration
 *
 * This function serves as the main entry point for schema generation.
 * It retrieves table definitions from the consent module and processes
 * them into a structured schema representation.
 *
 * @param config - The complete C15T configuration
 * @returns A structured schema definition with fields and table properties
 *
 * @example
 * ```typescript
 * import type { C15TOptions } from ~/pkgs/types";
 *
 * // Your configuration
 * const c15tConfig: C15TOptions = {
 *   // configuration properties
 * };
 *
 * const schema = getSchema(c15tConfig);
 * // Use schema for migrations or database operations
 * ```
 */
export function getSchema(config: C15TOptions): SchemaDefinition {
	try {
		// Retrieve table definitions from the consent module
		const tables = getConsentTables(config);

		// Process tables into a structured schema
		return processTablesIntoSchema(tables);
	} catch (error) {
		// Log the error or handle it according to your application's needs
		// biome-ignore lint/suspicious/noConsole: <explanation>
		console.error('Failed to generate schema:', error);
		throw new Error(
			`Schema generation failed: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}
