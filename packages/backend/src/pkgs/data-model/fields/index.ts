/**
 * Fields Module
 *
 * This module provides field definition utilities for the data model system.
 */

// Export field options
export type {
	DateFieldOptions,
	NumberFieldOptions,
	StringFieldOptions,
} from './field-factory';

// Export factory functions
export { COMMON_TIMEZONES } from './field-factory';
// Export field inference utilities
export type {
	InferFieldInput,
	InferFieldOutput,
} from './field-inference';
// Export core types
export type {
	Field,
	FieldConfig,
	FieldType,
	JsonValue,
	Primitive,
} from './field-types';
// Export ID generator
export { generateId } from './id-generator';
// Export SuperJSON utilities
export {
	type DatabaseType,
	getDatabaseType,
} from './superjson-utils';
// Export Zod utilities
export { validateField } from './zod-fields';
