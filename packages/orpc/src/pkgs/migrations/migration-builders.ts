import type { ColumnDataType, Expression, Kysely } from 'kysely';
import type {
	Database,
	KyselyDatabaseType,
} from '~/pkgs/db-adapters/adapters/kysely-adapter/types';
import { getLogger } from '~/pkgs/utils/logger';
import type { C15TOptions } from '~/types';
import { getType } from './type-mapping';
import type { ColumnsToAdd, MigrationOperation, TableToCreate } from './types';

/**
 * Builds migrations for adding columns to existing tables
 *
 * This function creates ALTER TABLE statements to add missing columns
 * to existing tables in the database.
 *
 * @param db - Kysely database instance used to build SQL operations
 * @param toBeAdded - Collection of tables and columns that need to be added
 * @param dbType - Database type to determine appropriate column types
 * @returns Array of migration operations ready to be executed
 */
export function buildColumnAddMigrations(
	db: Kysely<Database>,
	toBeAdded: ColumnsToAdd[],
	dbType: KyselyDatabaseType
): MigrationOperation[] {
	// Array to collect all migration operations
	const migrations: MigrationOperation[] = [];

	// Process each table that needs columns added
	for (const table of toBeAdded) {
		// For each field in the table that needs to be added
		for (const [fieldName, field] of Object.entries(table.fields)) {
			// Get the appropriate database-specific type for this field
			const type = getType(field, dbType) as
				| ColumnDataType
				| Expression<C15TOptions['database']>;

			// Build an ALTER TABLE statement using Kysely's fluent API
			const exec = db.schema
				.alterTable(table.table)
				// Add the column with the appropriate name and type
				.addColumn(fieldName, type, (col) => {
					// Start with nullability constraint based on field requirements
					let column = field.required !== false ? col.notNull() : col;

					// Add foreign key reference if specified
					if (field.references) {
						column = column.references(
							`${field.references.model}.${field.references.field}`
						);
					}

					// Add unique constraint if specified
					if (field.unique) {
						column = column.unique();
					}

					return column;
				});

			// Add this migration operation to our collection
			migrations.push(exec);
		}
	}

	return migrations;
}

/**
 * Builds migrations for creating new tables
 *
 * This function creates CREATE TABLE statements for tables
 * that don't exist in the database but are defined in the schema.
 *
 * @param db - Kysely database instance used to build SQL operations
 * @param toBeCreated - Collection of tables that need to be created
 * @param dbType - Database type to determine appropriate column types
 * @returns Array of migration operations ready to be executed
 */
export function buildTableCreateMigrations(
	db: Kysely<Database>,
	toBeCreated: TableToCreate[],
	dbType: KyselyDatabaseType
): MigrationOperation[] {
	const logger = getLogger();
	const migrations: MigrationOperation[] = [];

	// Process each table that needs to be created
	for (const table of toBeCreated) {
		// Log all field names to detect potential duplicate 'id' issues
		const fieldNames = Object.keys(table.fields);
		logger.info(
			`Creating table ${table.table} with fields: ${fieldNames.join(', ')}`
		);

		// Check for potential ID field conflict - warning for explicit 'id' field
		// This is important because we automatically add an 'id' primary key
		if (fieldNames.includes('id')) {
			logger.warn(
				`⚠️ Table ${table.table} already has an explicit 'id' field, which may conflict with the auto-generated primary key`
			);
		}

		// Check for another potential issue: field with fieldName 'id' but different key
		// This could cause column duplication errors
		for (const [fieldName, field] of Object.entries(table.fields)) {
			if (field.fieldName === 'id' && fieldName !== 'id') {
				logger.error(
					`❌ ERROR: Table ${table.table} has field '${fieldName}' with fieldName 'id' - this will cause a duplicate column error`
				);
			}
		}

		// Start building the CREATE TABLE statement
		// Always add an 'id' primary key column first
		let dbT = db.schema.createTable(table.table).addColumn(
			'id',
			// Choose appropriate ID type based on database
			// MySQL and MSSQL use varchar(36) for UUIDs, others use text
			dbType === 'mysql' || dbType === 'mssql' ? 'varchar(36)' : 'text',
			// Make it a primary key and non-nullable
			(col) => col.primaryKey().notNull()
		);

		// Now add all the subject-defined fields to the table
		for (const [fieldName, field] of Object.entries(table.fields)) {
			// Get appropriate database-specific type for this field
			const type = getType(field, dbType) as
				| ColumnDataType
				| Expression<C15TOptions['database']>;

			// Log what we're doing for debugging purposes
			logger.info(
				`Adding column ${fieldName} (fieldName: ${field.fieldName || fieldName}) to table ${table.table}`
			);

			// Add this column to the CREATE TABLE statement
			dbT = dbT.addColumn(fieldName, type, (col) => {
				// Apply constraints to the column

				// 1. Nullability constraint - make NOT NULL if field is required
				let column = field.required !== false ? col.notNull() : col;

				// 2. Foreign key constraint - add REFERENCES if field references another table
				if (field.references) {
					column = column.references(
						`${field.references.model}.${field.references.field}`
					);
				}

				// 3. Uniqueness constraint - add UNIQUE if the field must have unique values
				if (field.unique) {
					column = column.unique();
				}

				return column;
			});
		}

		// Generate and log the raw SQL for debugging/preview
		const sqlDebug = dbT.compile().sql;
		logger.info(`SQL for table ${table.table}:\n${sqlDebug}`);

		// Add this completed CREATE TABLE statement to our migrations collection
		migrations.push(dbT);
	}

	return migrations;
}
