/**
 * Database utility functions
 */
import { StandardSchemaV1 } from '@standard-schema/spec';
import type {
	EntitySchemaDefinition,
	FieldValueType,
	SchemaField,
} from '../schema/schema.types';
import { getAdapter } from './adapters';
import type { TableDefinition } from './adapters/adapter';

/**
 * Helper function to generate a table definition for an entity
 * @param entity The entity definition
 * @param adapterType The database adapter type to use
 * @returns A table definition
 */
export function generateTableDefinition(
	entity: EntitySchemaDefinition,
	adapterType = 'sqlite'
): TableDefinition {
	const adapter = getAdapter(adapterType);
	if (!adapter) {
		throw new Error(`Adapter not found for type: ${adapterType}`);
	}
	return adapter.generateTableDefinition(entity);
}

/**
 * Helper function to generate SQL for creating a table from an entity
 * @param entity The entity definition
 * @param adapterType The database adapter type to use
 * @returns SQL string for creating the table
 */
export function generateSQLForEntity(
	entity: EntitySchemaDefinition,
	adapterType = 'sqlite'
): string {
	const adapter = getAdapter(adapterType);
	const tableDef = adapter.generateTableDefinition(entity);
	return adapter.generateCreateTableSQL(tableDef);
}

/**
 * Helper function to transform a value to database format
 * @param field The field definition
 * @param value The value to transform
 * @param adapterType The database adapter type to use
 * @returns The transformed value
 */
export function toDatabaseValue<TField>(
	field: TField,
	value: SchemaField<
		string,
		FieldValueType,
		StandardSchemaV1<unknown, FieldValueType>
	>,
	adapterType = 'sqlite'
): unknown {
	const adapter = getAdapter(adapterType);
	return adapter.toDatabase(field, value);
}
/**
 * Helper function to transform a value from database format
 * @param field The field definition
 * @param dbValue The database value to transform
 * @param adapterType The database adapter type to use
 * @returns The transformed value
 */
export function fromDatabaseValue<TField>(
	field: TField,
	dbValue: SchemaField<
		string,
		FieldValueType,
		StandardSchemaV1<unknown, FieldValueType>
	>,
	adapterType = 'sqlite'
): any {
	const adapter = getAdapter(adapterType);
	return adapter.fromDatabase(field, dbValue);
}
