import type { TableMetadata } from 'kysely';
import type { Field } from '~/db/core/fields';
import type { KyselyDatabaseType } from '~/pkgs/db-adapters/adapters/kysely-adapter/types';
import type { C15TOptions } from '~/types';
import { createLogger } from '~/utils/logger';
/**
 * Schema comparison functionality for database migrations
 *
 * This module analyzes differences between the expected schema definition and the
 * actual database schema to determine what tables need to be created and what
 * columns need to be added to existing tables.
 *
 * The comparison process follows these steps:
 * 1. Load the expected schema from configuration
 * 2. Compare it with tables in the actual database
 * 3. Identify tables that don't exist but should be created
 * 4. Identify columns that need to be added to existing tables
 *
 * @remarks
 * This is a core part of the migration system and is used by the main migration
 * generator to determine what database changes are needed.
 *
 * @module migration/schema-comparison
 */
import { getSchema } from './get-schema';
import { matchType } from './type-mapping';
import type {
	ColumnsToAdd,
	TableSchemaDefinition,
	TableToCreate,
} from './types';

/**
 * Analyzes schema differences between the expected schema and actual database
 *
 * This function compares the schema defined in the application with the
 * actual database structure to determine what changes need to be made.
 *
 * @param config - c15t configuration containing the schema definition
 * @param tableMetadata - Database table metadata from introspection, containing
 *                        information about existing tables and columns
 * @param dbType - The database type (postgres, mysql, sqlite, mssql) which affects
 *                 how types are compared and mapped
 *
 * @returns An object containing tables to be created and columns to be added
 *
 * @example
 * ```typescript
 * const changes = analyzeSchemaChanges(
 *   appConfig,
 *   databaseMetadata,
 *   'postgres'
 * );
 *
 * console.log(`Need to create ${changes.toBeCreated.length} tables`);
 * console.log(`Need to add columns to ${changes.toBeAdded.length} tables`);
 * ```
 */
export function analyzeSchemaChanges(
	config: C15TOptions,
	tableMetadata: TableMetadata[],
	dbType: KyselyDatabaseType
): { toBeCreated: TableToCreate[]; toBeAdded: ColumnsToAdd[] } {
	const betterAuthSchema = getSchema(config);
	const logger = createLogger(config.logger);
	const toBeCreated: TableToCreate[] = [];
	const toBeAdded: ColumnsToAdd[] = [];

	for (const [key, value] of Object.entries(betterAuthSchema)) {
		const table = tableMetadata.find((t: { name: string }) => t.name === key);
		if (!table) {
			handleNewTable(key, value as TableSchemaDefinition, toBeCreated);
			continue;
		}

		handleExistingTable(
			key,
			value as TableSchemaDefinition,
			table,
			toBeAdded,
			dbType,
			logger
		);
	}

	return { toBeCreated, toBeAdded };
}

/**
 * Handles logic for a table that needs to be created
 *
 * This function adds a new table to the list of tables to be created,
 * handling cases where the table might already be in the list, or
 * where it needs to be inserted at a specific position based on order.
 *
 * @param tableName - The name of the table to be created
 * @param value - Table definition containing fields and order
 * @param toBeCreated - Array of tables to be created, modified in-place
 *
 * @remarks
 * The function uses the table's order property to maintain dependencies
 * between tables. Tables with lower order values are created first.
 *
 * If a table with the same name already exists in the list, its fields
 * will be merged with the new fields rather than replacing the entry.
 */
function handleNewTable(
	tableName: string,
	value: TableSchemaDefinition,
	toBeCreated: TableToCreate[]
): void {
	const tIndex = toBeCreated.findIndex((t) => t.table === tableName);
	const tableData = {
		table: tableName,
		fields: value.fields,
		order: value.order || Number.POSITIVE_INFINITY,
	};

	const insertIndex = toBeCreated.findIndex(
		(t) => (t.order || Number.POSITIVE_INFINITY) > tableData.order
	);

	if (insertIndex === -1) {
		if (tIndex === -1) {
			toBeCreated.push(tableData);
		} else {
			const existingTable = toBeCreated[tIndex];
			if (existingTable) {
				existingTable.fields = {
					...existingTable.fields,
					...value.fields,
				};
			}
		}
	} else {
		toBeCreated.splice(insertIndex, 0, tableData);
	}
}

/**
 * Handles logic for an existing table that might need columns added
 *
 * This function compares the expected table fields with the actual
 * table columns to determine which columns need to be added.
 * It also logs warnings for type mismatches.
 *
 * @param tableName - The name of the table being checked
 * @param value - Table definition containing expected fields and order
 * @param table - Actual table metadata from database introspection
 * @param toBeAdded - Array of table columns to be added, modified in-place
 * @param dbType - Database type for type matching
 * @param logger - Logger instance for warnings and errors
 *
 * @remarks
 * Fields are compared by name and type. If a field exists in the expected schema
 * but not in the actual table, it will be added to the list of columns to add.
 *
 * If a field exists in both but has a different type, a warning is logged.
 * Type matching takes into account differences in type names between database systems.
 *
 * @example
 * ```typescript
 * // This might produce logs like:
 * // "Field subjectId in table subjects has a different type in the database. Expected string but got varchar."
 * handleExistingTable(
 *   'subjects',
 *   { fields: { subjectId: { type: 'string', required: true } }, order: 1 },
 *   dbTable,
 *   columnsToAdd,
 *   'postgres',
 *   logger
 * );
 * ```
 */
function handleExistingTable(
	tableName: string,
	value: TableSchemaDefinition,
	table: TableMetadata,
	toBeAdded: ColumnsToAdd[],
	dbType: KyselyDatabaseType,
	logger: ReturnType<typeof createLogger>
): void {
	// Collection of fields that need to be added to the existing table
	const toBeAddedFields: Record<string, Field> = {};

	// Iterate through each field in the expected schema for this table
	for (const [fieldName, field] of Object.entries(value.fields)) {
		// Check if the field exists in the actual database table
		const column = table.columns.find((c) => c.name === fieldName);
		const typedField = field as Field;

		// If the field doesn't exist in the database, mark it to be added
		if (!column) {
			toBeAddedFields[fieldName] = typedField;
			continue; // Skip the rest of this iteration
		}

		// Field exists, so check if its type matches the expected type
		// If types match, no action needed so continue to next field
		if (matchType(column.dataType, typedField.type, dbType)) {
			continue;
		}

		// If we reach here, the field exists but has a different type
		// We don't alter column types to avoid data loss, just log a warning
		logger.warn(
			`Field ${fieldName} in table ${tableName} has a different type in the database. Expected ${typedField.type} but got ${column.dataType}.`
		);
	}

	// After checking all fields, if we found fields that need to be added,
	// add an entry to the toBeAdded array with all fields for this table
	if (Object.keys(toBeAddedFields).length > 0) {
		toBeAdded.push({
			table: tableName,
			fields: toBeAddedFields,
			order: value.order || Number.POSITIVE_INFINITY, // Use specified order or lowest priority
		});
	}
}
