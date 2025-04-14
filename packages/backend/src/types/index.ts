/**
 * C15T Types Package
 *
 * This package provides type definitions specific to the C15T consent management system.
 * It extends the base DoubleTie framework types with consent management specific functionality.
 *
 * The types in this folder should be used for consent management specific features, while
 * more generic SDK functionality should remain in the DoubleTie base types.
 */

// Re-export extended types that override doubletie base types
export type { C15TOptions } from './options';
export type { C15TContext } from './context';
export type { C15TPlugin } from './plugins';

// Export consent management specific types
export type { InferPluginContexts } from './plugins';

// Export API specific types
export type {
  ApiPath,
  ApiPathBase,
} from './api';
