import type { DatabaseConfig } from './config.types';

/**
 * Global application configuration
 */
class AppConfig {
	private _dbConfig: DatabaseConfig = {};

	/**
	 * Get the current database configuration
	 */
	get db(): DatabaseConfig {
		return { ...this._dbConfig }; // Return a shallow copy to prevent direct modification
	}

	/**
	 * Set the database configuration
	 * @param config The database configuration to use
	 */
	setDatabaseConfig(config: DatabaseConfig): void {
		this._dbConfig = { ...config }; // Create a shallow copy of the input
	}
}

/**
 * Singleton instance of the app configuration
 */
export const appConfig = Object.freeze(new AppConfig());
