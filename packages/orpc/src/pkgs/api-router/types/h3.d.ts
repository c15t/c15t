/**
 * Type declarations for H3 framework extensions
 */

import type { Logger } from '@doubletie/logger';
import type { Adapter } from '~/pkgs/db-adapters/types';
import type { createRegistry } from '~/schema/create-registry';

declare module 'h3' {
	interface H3EventContext {
		/**
		 * The IP address of the client making the request
		 * Can be null if IP tracking is disabled or IP cannot be determined
		 */
		ipAddress: string | null;

		/**
		 * The user agent string from the client's browser
		 */
		userAgent: string | null;

		/**
		 * The registry of database operations
		 */
		registry: ReturnType<typeof createRegistry>;

		/**
		 * The database adapter
		 */
		adapter: Adapter;

		/**
		 * The trusted origins for CORS
		 */
		trustedOrigins: string[];

		/**
		 * The logger
		 */
		logger: Logger;
	}
}
