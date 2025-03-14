/**
 * API Router Package
 *
 * This package provides API routing capabilities for the C15T framework.
 * It exports utilities for creating, configuring, and consuming API endpoints
 * while maintaining separation from specific route implementations.
 */

// Re-export core router functionality
export * from './router';

// Re-export utility functions for API calls
export * from './call';

// Re-export endpoint conversion utilities
export * from './to-endpoints';
