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

/**
 * Error codes used throughout the system for consistent error handling
 */
export * from './pkgs/errors/codes';

//------------------------------------------------------------------------------
// Data Model and Database Adapters
//------------------------------------------------------------------------------

/**
 * Data model - field definitions and utilities
 */
export * from './pkgs/data-model/fields';

/**
 * Data model - type definitions
 */
export * from './pkgs/data-model/schema/types';

/**
 * Data model - schema parsing utilities
 */
export {
	parseInputData,
	parseEntityOutputData,
	getAllFields,
} from './pkgs/data-model/schema/parser';

/**
 * Schema retrieval and utilities
 */
export {
	getSchema,
	getSchemaForTable,
	getSchemaForEntity,
} from './pkgs/data-model/schema/get-schema';

//------------------------------------------------------------------------------
// Utilities and Helpers
//------------------------------------------------------------------------------

/**
 * General utility functions used throughout the library
 */
export * from './utils';

//------------------------------------------------------------------------------
// Client
//------------------------------------------------------------------------------

/**
 * Client-side integration for implementing consent in browsers
 */
export * from './client';

/**
 * All client-related types bundled under a namespace to avoid conflicts
 */
export * as ClientTypes from './client/types';

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

/**
 * Plugin type extension point for type augmentation
 */
declare module './pkgs/types/plugins' {
	interface PluginTypes {
		// Plugin type interfaces will be added here
	}
}
