/**
 * Database Hooks Module
 *
 * A comprehensive system for intercepting, validating, and transforming data
 * during database operations. Hooks provide a powerful way to implement
 * cross-cutting concerns like validation, authorization, and data enrichment.
 *
 * This module provides:
 * - Type definitions for hooks and their operations
 * - Core hook processing utilities
 * - Operation-specific hook implementations (create, update, updateMany)
 * - A factory for generating hook-enabled database operations
 *
 * @module db/hooks
 *
 * @example
 * ```typescript
 * import { getWithHooks } from '~/db/hooks';
 * import { adapter } from '~/adapters';
 *
 * // Create hook-enabled database operations
 * const { createWithHooks } = getWithHooks(adapter, {
 *   options: config,
 *   hooks: config.databaseHooks || []
 * });
 *
 * // Use hooks with database operations
 * const subject = await createWithHooks({
 *   data: { name: 'Alice', email: 'alice@example.com' },
 *   model: 'subject'
 * });
 * ```
 */
export type { DatabaseHook } from './types';
export { createWithHooks } from './create-hooks';
export { updateWithHooks } from './update-hooks';
export { updateManyWithHooks } from './update-many-hooks';
export { getWithHooks } from './with-hooks-factory';
export { processHooks, processAfterHooksForMany } from './utils';
