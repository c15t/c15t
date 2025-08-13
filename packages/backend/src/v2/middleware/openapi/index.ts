/**
 * OpenAPI middleware for c15t
 *
 * This module provides OpenAPI functionality including:
 * - Configuration management
 * - Specification generation
 * - Documentation UI
 */

export { createOpenAPIConfig, createDefaultOpenAPIOptions } from './config';
export { createOpenAPISpec, createDocsUI } from './handlers';
