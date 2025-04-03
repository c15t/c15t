import type { Adapter } from '~/pkgs/db-adapters/types';
import type { Logger } from '~/pkgs/logger';
import type { createRegistry } from '~/schema/create-registry';
import type { DoubleTieOptions } from '../../types/options';

export interface H3EventContext {
	/**
	 * IP address of the client
	 */
	ipAddress?: string | null;

	/**
	 * User agent string
	 */
	userAgent?: string | null;

	/**
	 * Registry for database operations
	 */
	registry: ReturnType<typeof createRegistry>;

	/**
	 * Database adapter
	 */
	adapter: Adapter;

	/**
	 * Trusted origins for CORS
	 */
	trustedOrigins: string[];

	/**
	 * Any other context properties
	 */
	[key: string]: unknown;
}

export interface RouterProps {
	/**
	 * Configuration options
	 */
	options: DoubleTieOptions;

	/**
	 * Router context
	 */
	context: {
		/**
		 * Database adapter
		 */
		adapter: Adapter;

		/**
		 * Trusted origins for CORS
		 */
		trustedOrigins: string[];

		/**
		 * Registry for database operations
		 */
		registry: ReturnType<typeof createRegistry>;

		/**
		 * Logger
		 */
		logger: Logger;
	};
}
