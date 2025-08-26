/**
 * OpenAPI middleware for c15t
 *
 * This module provides OpenAPI functionality including:
 * - Configuration management
 * - Specification generation
 * - Documentation UI
 */

export { createDefaultOpenAPIOptions, createOpenAPIConfig } from './config';
export { createDocsUI, createOpenAPISpec } from './handlers';
