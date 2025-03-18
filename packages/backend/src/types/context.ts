import type { BaseDoubleTieContext } from '~/pkgs/types/context';
import type { getConsentTables } from '~/schema/definition';

/**
 * Enhanced base C15T context interface for consent management
 *
 * Extends the DoubleTie base context with additional properties specifically
 * needed for consent management functionality.
 */
export interface BaseC15TContext extends BaseDoubleTieContext {
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
	TPluginContext extends Record<string, unknown> = Record<string, unknown>,
> = BaseC15TContext & TPluginContext;

/**
 * Context with a specific consent plugin
 *
 * This utility type makes it easier to create contexts with
 * a specific consent plugin's context properties.
 *
 * @typeParam TPluginName - The name of the plugin
 * @typeParam TPluginContext - The plugin-specific context properties
 *
 * @example
 * ```ts
 * type AnalyticsContextType = { trackEvent: (name: string) => void };
 * type ContextWithAnalytics = ContextWithPlugin<'analytics', AnalyticsContextType>;
 *
 * // Now you can access context.analytics.trackEvent
 * ```
 */
export type ContextWithPlugin<
	TPluginName extends string,
	TPluginContext extends Record<string, unknown>,
> = C15TContext<Record<TPluginName, TPluginContext>>;
