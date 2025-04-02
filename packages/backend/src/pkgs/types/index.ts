/**
 * DoubleTie Framework Types Package
 *
 * This package provides base type definitions for the DoubleTie SDK framework.
 * It includes generic API types, context types, option types, plugin types,
 * and helper types that can be extended by specific implementations like c15t.
 */

export type {
	HookEndpointContext,
	GenericEndpointContext,
	BaseContext,
	RegistryContext,
	BaseDoubleTieContext,
} from './context';
export type { DoubleTieOptions } from './options';
export type { DoubleTieContext } from './context';
export type { PluginHookContext, PluginHook } from './plugins';
