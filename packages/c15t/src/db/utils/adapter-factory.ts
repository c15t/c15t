import { getConsentTables } from '~/db';
import { C15TError } from '~/error';
import type { C15TOptions } from '~/types';
import { createKyselyAdapter } from '~/db/adapters/kysely-adapter/dialect';
import { kyselyAdapter } from '~/db/adapters/kysely-adapter';
import { memoryAdapter } from '~/db/adapters/memory-adapter';
import { createLogger } from '~/utils/logger';

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
 * const users = await adapter.findMany('user', { where: { active: true } });
 * ```
 */
export async function getAdapter(options: C15TOptions) {
	const logger = createLogger();

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
		throw new C15TError('Failed to initialize database adapter');
	}

	return kyselyAdapter(kysely, {
		type: databaseType || 'sqlite',
	})(options);
}
