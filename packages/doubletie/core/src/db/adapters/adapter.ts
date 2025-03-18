import type { SchemaField } from '../../schema/schema.types';
import type { EntitySchemaDefinition } from '../../schema/schema.types';

/**
 * Represents a database column definition
 */
export interface ColumnDefinition<TColumnType extends string = string> {
	/**
	 * Column name
	 */
	name: string;

	/**
	 * Data type
	 */
	type: string;

	/**
	 * Whether the column can contain null values
	 */
	nullable?: boolean;

	/**
	 * Whether the column is a primary key
	 */
	primaryKey?: boolean;

	/**
	 * Whether the column has a unique constraint
	 */
	unique?: boolean;

	/**
	 * Whether the column auto-increments
	 * (specific implementation depends on the database)
	 */
	autoIncrement?: boolean;

	/**
	 * Default value expression
	 */
	defaultValue?: any;

	/**
	 * Whether this is a generated column
	 */
	generated?: boolean;

	/**
	 * Column expression for generated columns
	 */
	generatedExpression?: string;

	/**
	 * Relationship information
	 * Used to be populated during schema resolution
	 */
	relationship?: any;
}

/**
 * Represents a database table index definition
 */
export interface IndexDefinition {
	/**
	 * Index name
	 */
	name: string;

	/**
	 * Columns included in the index
	 */
	columns: string[];

	/**
	 * Whether this is a unique index
	 */
	unique?: boolean;
}

/**
 * Represents a primary key constraint
 */
export interface PrimaryKeyDefinition<TPrimaryKeyType extends string = string> {
	/**
	 * Constraint name
	 */
	name: string;

	/**
	 * Columns included in the primary key
	 */
	columns: string[];
}

/**
 * Represents a foreign key constraint
 */
export interface ForeignKeyDefinition<TOnAction extends string = string> {
	/**
	 * Constraint name
	 */
	name: string;

	/**
	 * Columns that reference another table
	 */
	columns: string[];

	/**
	 * Table being referenced
	 */
	referencedTable: string;

	/**
	 * Columns being referenced
	 */
	referencedColumns: string[];

	/**
	 * Action to take when referenced row is deleted
	 */
	onDelete?: TOnAction;

	/**
	 * Action to take when referenced row is updated
	 */
	onUpdate?: TOnAction;
}

/**
 * Represents a database table definition
 */
export interface TableDefinition<
	TTableOptions extends Record<string, any> = {},
	TColumnType extends string = string,
	TPrimaryKeyType extends string = string,
	TOnAction extends string = string,
> {
	/**
	 * Table name
	 */
	name: string;

	/**
	 * Column definitions
	 */
	columns: ColumnDefinition<TColumnType>[];

	/**
	 * Primary key constraint
	 */
	primaryKey?: PrimaryKeyDefinition<TPrimaryKeyType>;

	/**
	 * Foreign key constraints
	 */
	foreignKeys?: ForeignKeyDefinition<TOnAction>[];

	/**
	 * Index definitions
	 */
	indexes?: IndexDefinition[];

	/**
	 * Database-specific table options
	 */
	options?: TTableOptions;
}

/**
 * Database-specific table options
 */
export interface TableOptions {
	[key: string]: any;
}

/**
 * Interface for database adapters
 *
 * This defines the contract for how the core schema types map
 * to database-specific implementations.
 */
export interface DatabaseAdapter<TColumnType extends string = string> {
	/**
	 * Database type identifier
	 */
	readonly type: string;

	/**
	 * Database name for display purposes
	 */
	readonly displayName: string;

	/**
	 * Map a schema field to a database column definition
	 */
	mapFieldToColumn<
		TFieldType extends string = string,
		TColumnType extends string = string,
	>(
		field: SchemaField<TFieldType>,
		fieldName: string,
		entity: EntitySchemaDefinition
	): ColumnDefinition<TColumnType>;

	/**
	 * Generate a table definition from an entity schema
	 */
	generateTableDefinition<
		TTableOptions extends Record<string, any> = {},
		TColumnType extends string = string,
		TPrimaryKeyType extends string = string,
		TOnAction extends string = string,
	>(
		entity: EntitySchemaDefinition
	): TableDefinition<TTableOptions, TColumnType, TPrimaryKeyType, TOnAction>;

	/**
	 * Generate a SQL statement to create a table
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
	): string;

	/**
	 * Transform a value from application format to database format
	 */
	toDatabase(value: any, field: SchemaField): any;

	/**
	 * Transform a value from database format to application format
	 */
	fromDatabase(dbValue: any, field: SchemaField): any;
}

/**
 * Improved entity schema definition
 * @template TEntityName The entity name
 * @template TFields The entity fields
 */
