/**
 * c15t Consent Management System
 *
 * This is the main entry point for the c15t library, exporting all public APIs,
 * components, and types needed to implement consent management in your application.
 */

//------------------------------------------------------------------------------
// Core API
//------------------------------------------------------------------------------

/**
 * Core factory function and types for creating c15t instances
 */
export * from './core';

// Export the C15TInstance type explicitly for easier consumption
export type { C15TInstance } from './core';

/**
 * Selected client types needed for common use cases
 */
export type {
	c15tClientOptions,
	FetchOptions,
	ResponseContext,
} from './client/types';

//------------------------------------------------------------------------------
// Plugins
//------------------------------------------------------------------------------

/**
 * Geo plugin for jurisdiction-based consent management
 */
export * from './plugins/geo';

//------------------------------------------------------------------------------
// Types
//------------------------------------------------------------------------------

/**
 * All system types bundled under a namespace to avoid conflicts
 */
export * as Types from './pkgs/types';
