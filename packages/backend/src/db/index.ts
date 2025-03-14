/**
 * Database Module - Main Entry Point
 *
 * This module provides a type-safe interface for interacting with the database.
 * It re-exports components from the new data-model package structure.
 */

// Re-export from new package location
export * from '~/pkgs/data-model';

// Keep the adapter factory export here for backwards compatibility
export { getAdapter } from './utils/adapter-factory';
