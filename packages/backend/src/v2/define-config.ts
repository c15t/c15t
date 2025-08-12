import type { Adapter } from './pkgs/db-adapters';
import type { DatabaseOptions } from './types';
export interface DatabaseConfig extends DatabaseOptions {
	/**
	 * The type of database adapter you're using.
	 *
	 * @example 'kysleyAdapter'
	 */
	type: Adapter;
}

export const defineConfig = (config: DatabaseConfig) => config;
