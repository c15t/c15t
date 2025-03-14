/**
 * Fields Module
 *
 * This module provides field definition utilities for the data model system.
 */

// Export core types
export type {
	FieldType,
	Field,
	FieldConfig,
	Primitive,
	JsonValue,
} from './field-types';

// Export factory functions
export {
	stringField,
	numberField,
	booleanField,
	dateField,
	stringArrayField,
	numberArrayField,
	COMMON_TIMEZONES,
} from './field-factory';

// Export field options
export type {
	NumberFieldOptions,
	StringFieldOptions,
	JsonFieldOptions,
	TimezoneFieldOptions,
	DateFieldOptions,
} from './field-factory';

// Export ID generator
export { generateId } from './id-generator';

// Export SuperJSON utilities
export {
	getDatabaseType,
	transformForDb,
	parseFromDb,
	normalizeDatabaseType,
	type DatabaseType,
} from './superjson-utils';

// Export Zod utilities
export {
	validateField,
	createFieldValueSchema,
} from './zod-fields';

// Export field inference utilities
export type {
	InferFieldOutput,
	InferFieldInput,
	InferFieldsOutput,
	InferFieldsInput,
	TransformOutputFn,
} from './field-inference';
