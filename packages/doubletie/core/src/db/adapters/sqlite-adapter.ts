import type {
	EntitySchemaDefinition,
	SchemaField,
} from '../../schema/schema.types';
import type { ColumnDefinition, TableDefinition } from './adapter';
/**
 * SQLite-specific database adapter implementation
 */
import { BaseAdapter } from './base-adapter';

// Define interface for SQLite-specific column properties
interface SQLiteColumnDefinition<T extends string = string>
	extends ColumnDefinition<T> {
	_references?: { table: string; column: string };
	_onDelete?: string;
	_onUpdate?: string;
}

/**
 * SQLite adapter for mapping schema fields to SQLite table definitions
 */
export class SQLiteAdapter extends BaseAdapter {
	type = 'sqlite';
	displayName = 'SQLite';

	/**
	 * Map a schema field to a SQLite column definition
	 */
	mapFieldToColumn<
		TFieldType extends string = string,
		TColumnType extends string = string,
	>(
		field: SchemaField<TFieldType>,
		fieldName: string,
		entity: EntitySchemaDefinition
	): ColumnDefinition<TColumnType> {
		// Create the basic column definition
		const columnDef: SQLiteColumnDefinition<TColumnType> = {
			name: fieldName,
			type: this.mapFieldTypeToSQLiteType(field),
			nullable: !field.required,
			primaryKey: field.primaryKey === true,
			unique: field.databaseHints?.unique === true,
		};

		// Handle autoincrement for numbers
		if (
			field.type === 'number' &&
			(field.databaseHints as any)?.autoIncrement === true
		) {
			columnDef.autoIncrement = true;
		}

		// Add relationship reference
		if (field.relationship) {
			// Add reference information but not directly on the column definition
			const reference = {
				table: field.relationship.entity, // Use entity instead of model
				column: field.relationship.field,
			};

			// Store reference in a custom property
			columnDef._references = reference;

			// Handle relationship options if present
			if (field.relationship.relationship) {
				const relConfig = field.relationship.relationship;
				if (relConfig.onDelete) {
					columnDef._onDelete = relConfig.onDelete;
				}
				if (relConfig.onUpdate) {
					columnDef._onUpdate = relConfig.onUpdate;
				}
			}
		}

		columnDef.defaultValue = this.getDefaultValue(field);

		return columnDef;
	}

	/**
	 * Generate SQL to create a table in SQLite
	 */
	generateCreateTableSQL<
		TTableOptions extends Record<string, any> = {},
		TColumnType extends string = string,
		TPrimaryKeyType extends string = string,
		TOnAction extends string = string,
	>(
		tableDef: TableDefinition<
			TTableOptions,
			TColumnType,
			TPrimaryKeyType,
			TOnAction
		>
	): string {
		const columnDefs = tableDef.columns.map((col) => {
			let colDef = `"${col.name}" ${col.type}`;

			if (col.primaryKey) {
				colDef += ' PRIMARY KEY';
				if (col.autoIncrement) {
					colDef += ' AUTOINCREMENT';
				}
			}

			if (!col.nullable) {
				colDef += ' NOT NULL';
			}

			if (col.unique) {
				colDef += ' UNIQUE';
			}

			if (col.defaultValue !== undefined) {
				colDef += ` DEFAULT ${this.formatDefaultValue(col.defaultValue)}`;
			}

			return colDef;
		});

		// Add primary key constraint if it's not a single column
		if (
			tableDef.primaryKey &&
			typeof tableDef.primaryKey === 'object' &&
			Array.isArray(tableDef.primaryKey.columns) &&
			tableDef.primaryKey.columns.length > 1
		) {
			columnDefs.push(
				`PRIMARY KEY (${tableDef.primaryKey.columns.map((col) => `"${col}"`).join(', ')})`
			);
		}

		// Add foreign key constraints
		if (tableDef.foreignKeys && tableDef.foreignKeys.length > 0) {
			tableDef.foreignKeys.forEach((fk) => {
				if (
					fk.columns &&
					fk.columns.length > 0 &&
					fk.referencedTable &&
					fk.referencedColumns &&
					fk.referencedColumns.length > 0
				) {
					const constraint =
						`FOREIGN KEY (${fk.columns.map((col) => `"${col}"`).join(', ')}) ` +
						`REFERENCES "${fk.referencedTable}" (${fk.referencedColumns.map((col) => `"${col}"`).join(', ')})` +
						(fk.onDelete ? ` ON DELETE ${fk.onDelete}` : '') +
						(fk.onUpdate ? ` ON UPDATE ${fk.onUpdate}` : '');
					columnDefs.push(constraint);
				}
			});
		}

		const sql = `CREATE TABLE IF NOT EXISTS "${tableDef.name}" (\n  ${columnDefs.join(',\n  ')}\n);`;

		// Add indexes as separate statements
		let indexSql = '';
		if (tableDef.indexes && tableDef.indexes.length > 0) {
			tableDef.indexes.forEach((idx) => {
				if (idx.columns && idx.columns.length > 0) {
					indexSql +=
						`\nCREATE ${idx.unique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS "${idx.name}" ` +
						`ON "${tableDef.name}" (${idx.columns.map((col) => `"${col}"`).join(', ')});`;
				}
			});
		}

		return sql + indexSql;
	}

	/**
	 * Map field types to SQLite column types
	 */
	mapFieldTypeToSQLiteType(field: SchemaField): string {
		switch (field.type) {
			case 'string':
				return 'TEXT';
			case 'number':
				return field.databaseHints?.integer ? 'INTEGER' : 'REAL';
			case 'boolean':
				return 'INTEGER'; // SQLite has no dedicated boolean type
			case 'date':
				return 'TEXT'; // Store dates as ISO strings in SQLite
			case 'json':
				return 'TEXT'; // Store JSON as stringified text
			default:
				return 'TEXT'; // Default to TEXT for unknown types
		}
	}

	/**
	 * Get default value appropriate for SQLite
	 */
	protected getDefaultValue(field: SchemaField): any {
		if (field.defaultValue === undefined || field.defaultValue === null) {
			return null;
		}

		// Handle special cases for default values (like functions)
		if (typeof field.defaultValue === 'function') {
			// Special handling for function defaults
			if (field.type === 'date') {
				return 'CURRENT_TIMESTAMP';
			}
			// Other function defaults may need special treatment
			return null;
		}

		// For primitive values, handle them directly instead of using toDatabase
		if (typeof field.defaultValue === 'string') {
			return `'${field.defaultValue.replace(/'/g, "''")}'`;
		}

		if (typeof field.defaultValue === 'number') {
			return field.defaultValue.toString();
		}

		if (typeof field.defaultValue === 'boolean') {
			return field.defaultValue ? '1' : '0';
		}

		if (field.defaultValue instanceof Date) {
			return `'${field.defaultValue.toISOString()}'`;
		}

		if (typeof field.defaultValue === 'object') {
			// For objects, convert to JSON string
			return `'${JSON.stringify(field.defaultValue).replace(/'/g, "''")}'`;
		}

		// For any other types, use string representation
		return `'${String(field.defaultValue).replace(/'/g, "''")}'`;
	}

	/**
	 * Format default value for use in SQLite CREATE TABLE statement
	 */
	private formatDefaultValue(value: any): string {
		if (value === null) {
			return 'NULL';
		}

		if (typeof value === 'string') {
			// Escape single quotes
			const escaped = value.replace(/'/g, "''");
			return `'${escaped}'`;
		}

		if (typeof value === 'boolean') {
			return value ? '1' : '0';
		}

		if (typeof value === 'number') {
			return value.toString();
		}

		if (value instanceof Date) {
			return `'${value.toISOString()}'`;
		}

		if (typeof value === 'object') {
			// Convert object to JSON string
			return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
		}

		return String(value);
	}

	/**
	 * Transform a value from application format to SQLite format
	 * Override the base implementation for SQLite-specific transformations
	 */
	override toDatabase(field: SchemaField, value: any): any {
		if (value === undefined || value === null) {
			return value;
		}

		// SQLite-specific boolean conversion
		if (field.type === 'boolean' && typeof value === 'boolean') {
			return value ? 1 : 0;
		}

		return super.toDatabase(field, value);
	}

	/**
	 * Transform a value from SQLite format to application format
	 * Override the base implementation for SQLite-specific transformations
	 */
	override fromDatabase(field: SchemaField, dbValue: any): any {
		if (dbValue === undefined || dbValue === null) {
			return dbValue;
		}

		// SQLite-specific boolean conversion
		if (field.type === 'boolean' && typeof dbValue === 'number') {
			return dbValue !== 0;
		}

		return super.fromDatabase(field, dbValue);
	}
}
