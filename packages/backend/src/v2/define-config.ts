import type { DatabaseOptions } from '~/v2/types';
import { DB } from './schema';

/**
 * Defines the configuration for the backend database.
 * This is used for schema generation, migrations, and other database operations.
 * @param options - The options for the backend.
 * @returns The database client.
 */
export function defineConfig(options: DatabaseOptions) {
	const client = DB.client(options.adapter);

	return {
		client,
	};
}
