/**
 * @fileoverview Main entry point for c15t CLI onboarding
 *
 * This file has been refactored into smaller, more modular components.
 * For better maintainability, the implementation has been split into:
 * - templates.ts - Configuration templates
 * - detection.ts - Environment detection
 * - dependencies.ts - Dependency management
 * - storage-modes/ - Mode-specific handlers
 *
 * This file now re-exports the startOnboarding function from
 * the modular implementation for backward compatibility.
 */

export { startOnboarding } from './onboarding/index';
