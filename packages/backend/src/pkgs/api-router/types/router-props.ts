import type { Adapter } from '~/pkgs/db-adapters/types';
import type { Logger } from '~/pkgs/logger';
import type { createRegistry } from '~/schema/create-registry';
import type { DoubleTieOptions } from '../../types/options';

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
