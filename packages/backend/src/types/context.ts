import type { H3Event } from 'h3';
import type { Adapter } from '~/pkgs/db-adapters/types';
import type { Logger } from '~/pkgs/logger';
import type { DoubleTieContext } from '~/pkgs/types/context';
import type { DeepPartial } from '~/pkgs/types/helper';
import type { getConsentTables } from '~/schema';
import type { createRegistry } from '~/schema/create-registry';
import type { C15TOptions } from './options';
import type { C15TPlugin, InferPluginContexts } from './plugins';

/**
 * Enhanced base C15T context interface for consent management
 *
 * Extends the DoubleTie base context with additional properties specifically
 * needed for consent management functionality.
 */
export interface BaseC15TContext extends DoubleTieContext {
	/**
	 * Database tables specifically for the consent system
	 */
	tables: ReturnType<typeof getConsentTables>;

	/**
	 * IP address of the client - used for consent tracking
	 */
	ipAddress?: string | null;

	/**
	 * Subject agent of the client - used for consent tracking
	 */
	userAgent?: string | null;
}

/**
 * Complete C15T context type for consent management
 *
 * This type combines the base consent context with plugin-specific context extensions.
 * It's the primary context type used throughout the consent management system.
 *
 * @typeParam TPluginContext - Record of plugin-specific context properties
 */
export type C15TContext<
	PluginContexts extends Record<string, unknown> = InferPluginContexts<
		C15TPlugin[]
	>,
> = DoubleTieContext<PluginContexts>;

/**
 * Context for H3 event handlers
 */
export type C15TEventContext = H3Event & {
	context: C15TContext;
};

/**
 * Hook context for plugins
 */
export interface C15THookContext {
	/**
	 * Logger instance
	 */
	logger: Logger;

	/**
	 * Database adapter
	 */
	adapter: Adapter;

	/**
	 * Registry for database operations
	 */
	registry: ReturnType<typeof createRegistry>;

	/**
	 * Configuration options
	 */
	options: C15TOptions;

	/**
	 * Function to perform database operations
	 */
	dbHandler?: <T>(fn: () => Promise<T>) => Promise<T>;

	/**
	 * The path of the current request
	 */
	path?: string;

	/**
	 * Custom attributes for the context
	 */
	[key: string]: unknown;
}

/**
 * Plugin initialization result
 */
export type PluginInitResult = {
	context?: DeepPartial<Omit<C15TContext, 'options'>>;
	options?: Partial<C15TOptions>;
};
