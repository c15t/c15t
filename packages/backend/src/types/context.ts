import type { DoubleTieContext } from '~/pkgs/types/context';
import type { C15TPlugin, InferPluginContexts } from './plugins';

/**
 * Complete c15t context type for consent management
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
