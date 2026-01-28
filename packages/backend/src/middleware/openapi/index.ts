/**
 * OpenAPI middleware for c15t
 *
 * This module provides OpenAPI functionality including:
 * - Configuration management
 * - Documentation UI
 *
 * Note: OpenAPI spec generation is now handled by hono-openapi middleware.
 */

export { createDefaultOpenAPIOptions, createOpenAPIConfig } from './config';
export { createDocsUI } from './handlers';
