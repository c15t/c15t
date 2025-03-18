/**
 * Model mixins for enhancing base model functionality
 *
 * Includes enhancements for:
 * - Automatic timestamps (created_at, updated_at)
 * - Slug generation
 * - ID generation
 * - Cursor-based pagination
 * - Global ID handling
 *
 * New in 0.27.0: Enhanced setter methods for direct column updates
 *
 * @module mixins
 */

export { default as withUpdatedAt } from './updated-at';
export { default as withCreatedAt } from './created-at';
export { withSlug } from './slug';
export { withGlobalId } from './global-id';
export {
	default as withIdGenerator,
	type IdGeneratorOptions,
} from './id-generator';
export { default as withCursorable } from './cursorable';
export { default as withAssignProperties } from './assign';

export { Operation } from './slug';

// No need for separate export, now included with the default export
