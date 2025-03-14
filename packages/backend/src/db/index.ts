/**
 * Database Module - Main Entry Point
 *
 * This module provides a type-safe interface for interacting with the database.
 */

// Schema-related exports
export {
	getConsentTables,
	parseInputData,
	parseEntityOutputData,
	getAllFields,
} from './schema/index';

// Field-related exports
export type {
	Field,
	FieldType,
} from './core/fields';

export {
	stringField,
	numberField,
	booleanField,
	dateField,
	stringArrayField,
	numberArrayField,
} from './core/fields';

export { getAdapter } from './utils/adapter-factory';
