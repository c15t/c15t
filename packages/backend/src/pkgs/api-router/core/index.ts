/**
 * Core API Router Functionality
 *
 * This module contains the foundational components for creating
 * and configuring endpoint handlers and middleware in the DoubleTie API Router.
 *
 * @packageDocumentation
 */

// Context and middleware
export {
	optionsMiddleware,
	createSDKMiddleware,
	type DoubleTieMiddleware,
} from './context';

// Endpoint creation
export {
	createSDKEndpoint,
	type DoubleTieEndpoint,
} from './endpoint';

// Router functionality
export * from './router';
