/**
 * API Hook System
 *
 * This module provides a flexible hook system for the DoubleTie API router,
 * allowing custom processing logic to be injected at various stages of
 * the request lifecycle.
 *
 * @packageDocumentation
 */

// Hook types
export type { Hook } from './types';

// Hook processing
export {
	runBeforeHooks,
	runAfterHooks,
} from './processor';
