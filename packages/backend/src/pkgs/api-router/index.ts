/**
 * # DoubleTie API Router Package
 *
 * A flexible, type-safe API routing system for TypeScript applications built on the better-call library.
 * This package provides utilities for creating, configuring, and consuming API endpoints
 * while maintaining separation from specific route implementations.
 *
 * ## Key Features
 *
 * - **Type-safe endpoint definitions**: Strong TypeScript typing for request/response handling
 * - **Middleware support**: Pre/post request processing with powerful hook system
 * - **Plugin architecture**: Extensible system for adding custom functionality
 * - **Error handling**: Standardized error management with detailed logging
 * - **IP address tracking**: Utilities for client IP detection with privacy controls
 *
 * ## Example Usage
 *
 * ```typescript
 * import {
 *   createSDKEndpoint,
 *   createSDKMiddleware,
 *   createApiRouter,
 *   toEndpoints,
 *   wildcardMatch
 * } from '@doubletie/api-router';
 *
 * // Create an endpoint
 * const getUserEndpoint = createSDKEndpoint(async (context) => {
 *   const { userId } = context.params;
 *   const user = await getUserById(userId);
 *   return { user };
 * });
 *
 * // Create a middleware
 * const authMiddleware = createSDKMiddleware(async (context) => {
 *   const token = context.headers.get('Authorization');
 *   if (!token) {
 *     throw new APIError({
 *       message: 'Unauthorized',
 *       status: 'UNAUTHORIZED'
 *     });
 *   }
 *   return { context: { user: await validateToken(token) } };
 * });
 *
 * // Setup router
 * const router = createApiRouter(context, options, {
 *   getUser: getUserEndpoint
 * }, healthCheckEndpoint, [
 *   { path: '/users/**', middleware: authMiddleware }
 * ]);
 * ```
 *
 * @packageDocumentation
 */

// Core functionality - endpoint and middleware creation, router
export * from './core';

// Hook system for request/response processing
export * from './hooks';

// Endpoint conversion utilities
export * from './endpoints';

// Utility functions
export * from './utils';

export type { Endpoint } from 'better-call';
