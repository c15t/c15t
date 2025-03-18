/**
 * Main exports index
 * This file re-exports all functionality from the different modules.
 * For smaller bundle sizes, import directly from the specific modules:
 * - @doubletie/core/schema
 * - @doubletie/core/entity
 * - @doubletie/core/db
 * - @doubletie/core/validation
 * - @doubletie/core/config
 * - @doubletie/core/utils
 */

// Export all modules
export * from './schema';
export * from './entity';
export * from './db';
export * from './validation';
export * from './config';
export * from './utils/type-guards';

/**
 * Core package version
 */
export const VERSION = '1.0.0';
