/**
 * Schema module exports
 * @module schema
 */

// Basic schema exports
export { field, createField } from './fields/basic-fields';
export type {
	SchemaField,
	EntitySchemaDefinition,
	ResolvedField,
} from './schema.types';

// Field utilities exports
export {
	// Basic fields
	field as fieldWithValidator,
	createField as fieldWithoutValidator,
	stringField,
	numberField,
	booleanField,
	dateField,
	// ID fields
	idField,
	uuidField,
	prefixedIdField,
	incrementalIdField,
	// Timestamp fields
	timestampField,
	createdAtField,
	updatedAtField,
	deletedAtField,
	expiresAtField,
	// String fields
	emailField,
	urlField,
	timezoneField,
	slugField,
	phoneField,
	// JSON fields
	jsonField,
	metadataField,
	settingsField,
	// Array fields
	arrayField,
	stringArrayField,
	numberArrayField,
	refArrayField,
} from './fields';

export type {
	// ID field types
	IdType,
	IdFieldOptions,
	// Timestamp field types
	TimestampFieldOptions,
	TimestampFormat,
	// String field types
	StringFieldOptions,
	// JSON field types
	JsonFieldOptions,
	// Array field types
	ArrayFieldOptions,
	// Database hint types
	DatabaseHints,
	DatabaseStorageHints,
	SQLiteHints,
	MySQLHints,
	PostgresHints,
} from './fields';
