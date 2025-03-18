/**
 * Type guard utilities for doubletie core
 *
 * This file contains functions that help with type safety by providing runtime
 * type checking that also informs TypeScript about the types.
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { DatabaseConfig } from '../config/config.types';
import type { ResolvedEntitySchema } from '../db/merge';
import type { SqlColumnType, SqlDialect, TableDefinition } from '../db/table';
import type { EntityStructure } from '../entity/entity.types';
import type {
	EntityFieldReference,
	JoinTableConfig,
	RelationshipConfig,
	RelationshipType,
} from '../entity/relationship.types';
import type { FieldValueType, SchemaField } from '../schema/schema.types';
import type { FieldType } from '../validation/type-conversion';
import type { ValidationError } from '../validation/validate';

// Basic type guards
/**
 * Check if a value is a string
 */
export function isString(value: unknown): value is string {
	return typeof value === 'string';
}

/**
 * Check if a value is a number
 */
export function isNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Check if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
	return typeof value === 'boolean';
}

/**
 * Check if a value is a function
 */
export function isFunction(value: unknown): value is Function {
	return typeof value === 'function';
}

/**
 * Check if a value is an array
 */
export function isArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

/**
 * Check if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/**
 * Check if a value is a Date
 */
export function isDate(value: unknown): value is Date {
	return value instanceof Date;
}

/**
 * Check if a value is null
 */
export function isNull(value: unknown): value is null {
	return value === null;
}

/**
 * Check if a value is undefined
 */
export function isUndefined(value: unknown): value is undefined {
	return value === undefined;
}

/**
 * Check if a value is a valid field value type
 */
export function isFieldValueType(value: unknown): value is FieldValueType {
	return (
		isString(value) ||
		isNumber(value) ||
		isBoolean(value) ||
		isDate(value) ||
		isObject(value) ||
		isNull(value) ||
		isUndefined(value) ||
		isArray(value)
	);
}

// Entity type guards
/**
 * Check if a value is a valid EntityStructure
 */
export function isEntityStructure(value: unknown): value is EntityStructure {
	return (
		isObject(value) &&
		'name' in value &&
		isString(value.name) &&
		'fields' in value &&
		isObject(value.fields)
	);
}

/**
 * Check if a value is a valid EntitySchemaDefinition with required properties
 */
export function isEntitySchemaDefinition(value: unknown): boolean {
	return (
		isEntityStructure(value) &&
		'name' in value &&
		isString(value.name) &&
		'fields' in value &&
		isObject(value.fields)
	);
}

/**
 * Check if a value is a valid SchemaField
 */
export function isSchemaField<T extends FieldType = FieldType>(
	value: unknown
): value is SchemaField<T> {
	return isObject(value) && 'type' in value && isString(value.type);
}

/**
 * Check if a value is a valid Standard Schema validator
 */
export function isStandardSchema<TInput = unknown, TOutput = TInput>(
	value: unknown
): value is StandardSchemaV1<TInput, TOutput> {
	return (
		isObject(value) &&
		'~standard' in value &&
		isObject(value['~standard']) &&
		'validate' in value['~standard'] &&
		isFunction(value['~standard'].validate)
	);
}

/**
 * Type guard to check if a value is a record of a specific type
 */
export function isRecordOf<T>(
	value: unknown,
	itemTypeGuard: (item: unknown) => item is T
): value is Record<string, T> {
	if (!isObject(value)) {
		return false;
	}

	return Object.values(value).every((item) => itemTypeGuard(item));
}

/**
 * Type guard to check if a value is an array of a specific type
 */
export function isArrayOf<T>(
	value: unknown,
	itemTypeGuard: (item: unknown) => item is T
): value is T[] {
	return isArray(value) && value.every((item) => itemTypeGuard(item));
}

/**
 * Type guard to check if a string is a valid FieldType
 */
export function isFieldType(value: string): value is FieldType {
	return (
		[
			'string',
			'number',
			'boolean',
			'date',
			'timestamp',
			'uuid',
			'id',
			'incremental_id',
			'json',
			'array',
		].includes(value) || isString(value)
	);
}

/**
 * Type guard to check if a string is a valid RelationshipType
 */
export function isRelationshipType(value: string): value is RelationshipType {
	return ['oneToOne', 'oneToMany', 'manyToOne', 'manyToMany'].includes(value);
}

/**
 * Type guard to check if an object is a valid JoinTableConfig
 */
export function isJoinTableConfig(value: unknown): value is JoinTableConfig {
	if (!isObject(value)) {
		return false;
	}

	return (
		'name' in value &&
		isString(value.name) &&
		'sourceColumn' in value &&
		isString(value.sourceColumn) &&
		'targetColumn' in value &&
		isString(value.targetColumn)
	);
}

/**
 * Type guard to check if an object is a valid RelationshipConfig
 */
export function isRelationshipConfig(
	value: unknown
): value is RelationshipConfig {
	if (!isObject(value)) {
		return false;
	}

	if (
		!('type' in value && isString(value.type) && isRelationshipType(value.type))
	) {
		return false;
	}

	// Different validation based on relationship type
	if (value.type === 'manyToMany') {
		return (
			'joinTable' in value &&
			(isString(value.joinTable) || isJoinTableConfig(value.joinTable))
		);
	} else {
		// For other relationship types, foreignKey is required
		return 'foreignKey' in value && isString(value.foreignKey);
	}
}

/**
 * Type guard to check if a value is an EntityFieldReference
 */
export function isEntityFieldReference(
	value: unknown
): value is EntityFieldReference {
	if (!isObject(value)) {
		return false;
	}

	return (
		'entity' in value &&
		isString(value.entity) &&
		'field' in value &&
		isString(value.field)
	);
}

// Additional helper for ValidationError issues check
export function isValidationIssue(
	item: unknown
): item is { field: string; issues: string } {
	return (
		isObject(item) &&
		'field' in item &&
		isString(item.field) &&
		'issues' in item &&
		isString(item.issues)
	);
}

/**
 * Type guard to check if a value is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
	return (
		error instanceof Error &&
		'issues' in error &&
		isArrayOf((error as ValidationError).issues, isValidationIssue)
	);
}

/**
 * Type guard to check if a value is a valid DatabaseConfig
 */
export function isDatabaseConfig(value: unknown): value is DatabaseConfig {
	if (!isObject(value)) {
		return false;
	}

	return 'adapter' in value && isString(value.adapter);
}

/**
 * Type guard to check if a value is a valid SQL dialect
 */
export function isSqlDialect(value: unknown): value is SqlDialect {
	return isString(value) && ['postgresql', 'mysql', 'sqlite'].includes(value);
}

/**
 * Type guard to check if a value is a valid SQL column type
 */
export function isSqlColumnType(value: unknown): value is SqlColumnType {
	const validTypes = [
		'VARCHAR',
		'TEXT',
		'INTEGER',
		'BIGINT',
		'DECIMAL',
		'FLOAT',
		'BOOLEAN',
		'DATE',
		'TIMESTAMP',
		'JSON',
		'JSONB',
		'UUID',
		'ARRAY',
	];

	return isString(value) && validTypes.includes(value);
}

/**
 * Type guard to check if a value is a TableDefinition
 */
export function isTableDefinition(value: unknown): value is TableDefinition {
	if (!isObject(value)) {
		return false;
	}

	return (
		'name' in value &&
		isString(value.name) &&
		'columns' in value &&
		isArrayOf(value.columns, (col): col is unknown => {
			// Check minimal shape for ColumnDefinition
			return isObject(col) && 'name' in col && isString(col.name);
		}) &&
		// primaryKey is optional, but if present, must match PrimaryKeyDefinition
		(!('primaryKey' in value) ||
			(isObject(value.primaryKey) &&
				'name' in value.primaryKey &&
				isString(value.primaryKey.name) &&
				'columns' in value.primaryKey &&
				isArrayOf(value.primaryKey.columns, isString)))
	);
}

/**
 * Type guard to check if a value is a ResolvedEntitySchema
 */
export function isResolvedEntitySchema(
	value: unknown
): value is ResolvedEntitySchema<any> {
	if (!isObject(value)) {
		return false;
	}

	return (
		'entityName' in value &&
		isString(value.entityName) &&
		'entityPrefix' in value &&
		isString(value.entityPrefix) &&
		'fields' in value &&
		isObject(value.fields)
	);
}

/**
 * Assert that a value has a specific type using a type guard
 * @throws Error if the value doesn't match the type guard
 */
export function assertType<T>(
	value: unknown,
	typeGuard: (val: unknown) => val is T,
	errorMessage: string
): asserts value is T {
	if (!typeGuard(value)) {
		throw new Error(errorMessage);
	}
}

/**
 * Assert that a condition is true, with a custom error message
 * @throws Error if the condition is false
 */
export function assertCondition(
	condition: boolean,
	errorMessage: string
): asserts condition {
	if (!condition) {
		throw new Error(errorMessage);
	}
}
