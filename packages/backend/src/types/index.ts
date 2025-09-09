/**
 * c15t Types Package
 *
 * This package provides type definitions specific to the c15t consent management system.
 * It extends the base DoubleTie framework types with consent management specific functionality.
 *
 * The types in this folder should be used for consent management specific features, while
 * more generic SDK functionality should remain in the DoubleTie base types.
 */

// Export API specific types
export type {
	ApiPath,
	ApiPathBase,
} from './api';
export type { C15TContext } from './context';
// Re-export extended types that override doubletie base types
export type { C15TOptions } from './options';
// Export consent management specific types
export type { C15TPlugin, InferPluginContexts } from './plugins';

export const branding = ['c15t', 'consent', 'none'] as const;
export type Branding = (typeof branding)[number];
