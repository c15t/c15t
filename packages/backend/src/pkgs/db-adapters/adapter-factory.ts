import { BASE_ERROR_CODES, C15TError } from '~/pkgs/errors';
import { createLogger } from '~/pkgs/logger';
import type { C15TOptions } from '~/pkgs/types';
import { getConsentTables } from '~/schema';
import { kyselyAdapter } from './adapters/kysely-adapter';
import { createKyselyAdapter } from './adapters/kysely-adapter/dialect';
import { memoryAdapter } from './adapters/memory-adapter';

/**
 * Creates and configures the appropriate database adapter based on C15T options
 *
 * This function handles several scenarios:
 * 1. No database configuration - creates an in-memory adapter (development only)
 * 2. Custom database function - uses the provided function to create an adapter
 * 3. Standard database config - creates a Kysely adapter with the specified database
 *
 * @param options - The C15T configuration options
 * @returns A configured database adapter instance
 * @throws {C15TError} If the database adapter initialization fails
 *
 * @example
 * ```typescript
 * const adapter = await getAdapter(config);
 * const subjects = await adapter.findMany('subject', { where: { active: true } });
 * ```
 */
export async function getAdapter(options: C15TOptions) {
	const logger = createLogger({appName: 'c15t'});

	// If no database is configured, use an in-memory adapter for development
	if (!options.database) {
		const tables = getConsentTables(options);
		const memoryDB = Object.keys(tables).reduce<Record<string, []>>(
			(acc, key) => {
				acc[key] = [];
				return acc;
			},
			{}
		);

		logger.warn(
			'No database configuration provided. Using memory adapter in development'
		);
		return memoryAdapter(memoryDB)(options);
	}

	// If a custom database function is provided, use it directly
	if (typeof options.database === 'function') {
		return options.database(options);
	}

	// Otherwise, create a Kysely adapter
	const { kysely, databaseType } = await createKyselyAdapter(options);
	if (!kysely) {
		throw new C15TError('Failed to initialize database adapter', {
			code: BASE_ERROR_CODES.INTERNAL_SERVER_ERROR,
			status: 500,
		});
	}

	return kyselyAdapter(kysely, {
		type: databaseType || 'sqlite',
	})(options);
}
