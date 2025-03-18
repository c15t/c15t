import type { DatabaseHints } from '../../schema/fields/field-hints';
/**
 * Base adapter implementation with common functionality for all database adapters
 */
import type {
	EntitySchemaDefinition,
	SchemaField,
} from '../../schema/schema.types';
import type {
	ColumnDefinition,
	DatabaseAdapter,
	ForeignKeyDefinition,
	IndexDefinition,
	TableDefinition,
} from './adapter';

/**
 * Abstract base adapter that implements common functionality for database adapters
 */
export abstract class BaseAdapter implements DatabaseAdapter<string> {
	/**
	 * Database type identifier
	 */
	abstract readonly type: string;

	/**
	 * Database name for display purposes
	 */
	abstract readonly displayName: string;

	/**
	 * Map a schema field to a database column definition
	 */
	abstract mapFieldToColumn<
		TFieldType extends string = string,
		TColumnType extends string = string,
	>(
		field: SchemaField<TFieldType>,
		fieldName: string,
		entity: EntitySchemaDefinition
	): ColumnDefinition<TColumnType>;

	/**
	 * Generate a SQL statement to create a table
	 */
	abstract generateCreateTableSQL<
		TTableOptions extends Record<string, any> = {},
	>(tableDef: TableDefinition<TTableOptions>): string;

	/**
	 * Transform a value from application format to database format for storage
	 */
	toDatabase(value: any, field: SchemaField): any {
		if (value === undefined || value === null) {
			return value;
		}

		// Apply field-specific transforms if defined
		if (
			field.transform?.output &&
			typeof field.transform.output === 'function'
		) {
			// Use the output transform when converting to database format
			try {
				return field.transform.output(value);
			} catch (error) {
				// If transform fails, fall back to basic conversion
				console.warn(`Transform failed for field: ${field.type}`, error);
			}
		}

		// Basic type conversion based on field type
		switch (field.type) {
			case 'boolean':
				return typeof value === 'boolean'
					? value
					: value === 'true' || value === 1;
			case 'number':
				return typeof value === 'number' ? value : Number(value);
			case 'date':
				return value instanceof Date
					? value
					: typeof value === 'number'
						? new Date(value)
						: new Date(value as string);
			case 'json':
			case 'array':
			case 'object':
				// Always stringify JSON objects for consistency across adapters
				return JSON.stringify(value);
			default:
				return value;
		}
	}

	/**
	 * Transform a value from database format to application format
	 */
	fromDatabase(dbValue: any, field: SchemaField): any {
		if (dbValue === null || dbValue === undefined) {
			return dbValue;
		}

		// Apply field-specific transforms if defined
		if (field.transform?.input && typeof field.transform.input === 'function') {
			// Use the input transform when converting from database format
			try {
				return field.transform.input(dbValue);
			} catch (error) {
				// If transform fails, fall back to basic conversion
				console.warn(`Transform failed for field: ${field.type}`, error);
			}
		}

		// Basic type conversion based on field type
		switch (field.type) {
			case 'boolean':
				return typeof dbValue === 'boolean'
					? dbValue
					: dbValue === 'true' || dbValue === 1 || dbValue === '1';
			case 'number':
				return typeof dbValue === 'number' ? dbValue : Number(dbValue);
			case 'date':
				return dbValue instanceof Date
					? dbValue
					: typeof dbValue === 'number'
						? new Date(dbValue)
						: new Date(dbValue as string);
			case 'json':
			case 'array':
			case 'object':
				// Parse JSON strings back to objects
				if (typeof dbValue === 'string') {
					try {
						return JSON.parse(dbValue);
					} catch (e) {
						// If parsing fails, return as is
						return dbValue;
					}
				}
				return dbValue;
			default:
				return dbValue;
		}
	}

	/**
	 * Generate a table definition from an entity schema
	 */
	generateTableDefinition<
		TTableOptions extends Record<string, any> = {},
		TColumnType extends string = string,
		TPrimaryKeyType extends string = string,
		TOnAction extends string =
			| 'CASCADE'
			| 'SET NULL'
			| 'RESTRICT'
			| 'NO ACTION',
	>(
		entity: EntitySchemaDefinition
	): TableDefinition<TTableOptions, TColumnType, TPrimaryKeyType, TOnAction> {
		// Map entity fields to columns
		const columns: ColumnDefinition<TColumnType>[] = [];

		for (const [fieldName, field] of Object.entries(entity.fields)) {
			const column = this.mapFieldToColumn<string, TColumnType>(
				field,
				fieldName,
				entity
			);
			columns.push(column);
		}

		// Get entity name - use tableName from config if available, otherwise use entity name
		const tableName = (entity.config?.tableName as string) || entity.name;

		// Create the table definition
		const tableDef: TableDefinition<
			TTableOptions,
			TColumnType,
			TPrimaryKeyType,
			TOnAction
		> = {
			name: tableName,
			columns,
			primaryKey: {
				name: `pk_${entity.name}`,
				columns: columns.filter((col) => col.primaryKey).map((col) => col.name),
			},
			foreignKeys: [],
			indexes: [],
			options: {} as TTableOptions,
		};

		// Generate foreign keys for relationship fields
		const foreignKeys = this.generateForeignKeyConstraints<TOnAction>(tableDef);
		tableDef.foreignKeys = foreignKeys as ForeignKeyDefinition<TOnAction>[];

		return tableDef;
	}

	/**
	 * Helper method to generate indexes from entity definition
	 */
	protected generateIndexes(entity: EntitySchemaDefinition): IndexDefinition[] {
		const indexes: IndexDefinition[] = [];

		// Extract individual field indexes
		Object.entries(entity.fields).forEach(([fieldName, field]) => {
			// Get database hints
			const hints = field.databaseHints as DatabaseHints | undefined;
			if (hints?.indexed || hints?.unique) {
				indexes.push({
					name: `idx_${entity.name}_${fieldName}`,
					columns: [fieldName],
					unique: hints.unique,
				});
			}
		});

		// Add any entity-level indexes from config
		if (entity.config?.indexes) {
			const entityIndexes = entity.config.indexes as any[];
			entityIndexes.forEach((indexDef, i) => {
				indexes.push({
					name: indexDef.name || `idx_${entity.name}_${i}`,
					columns: Array.isArray(indexDef.columns)
						? indexDef.columns
						: [indexDef.columns],
					unique: indexDef.unique,
				});
			});
		}

		return indexes;
	}

	/**
	 * Generates foreign keys from relationship fields in an entity
	 */
	protected generateForeignKeys(
		entity: EntitySchemaDefinition
	): ForeignKeyDefinition<string>[] {
		const foreignKeys: ForeignKeyDefinition<string>[] = [];

		// Extract foreign keys from relationship fields
		for (const [fieldName, field] of Object.entries(entity.fields)) {
			if (field.relationship) {
				foreignKeys.push({
					name: `fk_${entity.name}_${fieldName}`,
					columns: [fieldName],
					referencedTable: field.relationship.entity || '',
					referencedColumns: [field.relationship.field || ''],
					onDelete: field.relationship.relationship?.onDelete as string,
					onUpdate: field.relationship.relationship?.onUpdate as string,
				});
			}
		}

		return foreignKeys;
	}

	/**
	 * Generates table constraints for foreign keys
	 */
	protected generateForeignKeyConstraints<TOnAction extends string = string>(
		tableDef: TableDefinition<Record<string, any>, string, string, TOnAction>
	): ForeignKeyDefinition<TOnAction>[] {
		const foreignKeys: ForeignKeyDefinition<TOnAction>[] = [];

		// Process each column for relationship references
		for (const column of tableDef.columns) {
			// Use type assertion to access _references property on extended column definitions
			const columnExt = column as any;
			if (columnExt._references) {
				const ref = columnExt._references;
				foreignKeys.push({
					name: `fk_${tableDef.name}_${column.name}`,
					columns: [column.name],
					referencedTable: ref.table,
					referencedColumns: [ref.column],
					onDelete: columnExt._onDelete as TOnAction,
					onUpdate: columnExt._onUpdate as TOnAction,
				});
			}
		}

		return foreignKeys;
	}

	/**
	 * Get default value appropriate for the database
	 * This method safely handles the defaultValue which may be a function
	 */
	protected getDefaultValueSQL(field: SchemaField): any {
		if (field.defaultValue === undefined || field.defaultValue === null) {
			return null;
		}

		// Handle function defaults separately
		if (typeof field.defaultValue === 'function') {
			// Let subclasses handle this case
			return null;
		}

		// Handle primitive types directly
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

		// For any other types, convert to string
		return `'${String(field.defaultValue).replace(/'/g, "''")}'`;
	}
}
