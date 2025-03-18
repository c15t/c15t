/**
 * Database hints for field definitions
 * These provide guidance to database adapters without tightly coupling fields to specific databases
 */

/**
 * Generic storage type categories supported across databases
 */
export type StorageTypeCategory =
	| 'text'
	| 'numeric'
	| 'binary'
	| 'temporal'
	| 'boolean'
	| 'json'
	| 'uuid';

/**
 * Precision levels for temporal data
 */
export type TemporalPrecision = 'second' | 'millisecond' | 'microsecond';

/**
 * Data size categories
 */
export type DataSizeCategory = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

/**
 * Access pattern types
 */
export type AccessPatternType = 'read-heavy' | 'write-heavy' | 'balanced';

/**
 * Generic collation strategies
 */
export type CollationStrategy = 'binary' | 'case-insensitive' | 'locale-aware';

/**
 * Generic storage characteristics to inform database adapters
 * @template TCollation The type of collation specification
 */
export interface DatabaseStorageHints<TCollation = CollationStrategy> {
	/**
	 * Preferred storage type category
	 */
	storageType?: StorageTypeCategory;

	/**
	 * Whether the field contains timezone information
	 */
	hasTimezone?: boolean;

	/**
	 * Precision level for numeric or temporal data
	 */
	precision?: TemporalPrecision | number;

	/**
	 * Scale for decimal numbers
	 */
	scale?: number;

	/**
	 * Typical size of the data in this field
	 */
	typicalSize?: DataSizeCategory;

	/**
	 * Maximum size in appropriate units (chars, bytes)
	 */
	maxSize?: number;

	/**
	 * Whether this field should be indexed
	 */
	indexed?: boolean;

	/**
	 * Whether this field is part of a unique constraint
	 */
	unique?: boolean;

	/**
	 * Typical access pattern for this field
	 */
	accessPattern?: AccessPatternType;

	/**
	 * How this field should be sorted/collated
	 */
	collation?: TCollation;
}

/**
 * SQLite type options
 */
export type SQLiteTypeOption = 'INTEGER' | 'REAL' | 'TEXT' | 'BLOB' | 'NUMERIC';

/**
 * SQLite-specific field hints
 * @template TType The SQLite-specific column type
 */
export interface SQLiteHints<TType extends SQLiteTypeOption = SQLiteTypeOption>
	extends DatabaseStorageHints {
	/**
	 * Direct type override for SQLite
	 */
	type?: TType;

	/**
	 * Whether this field uses the AUTOINCREMENT feature
	 */
	autoIncrement?: boolean;
}

/**
 * MySQL-specific field hints
 * @template TType The MySQL-specific column type
 * @template TCharset The character set type
 * @template TCollation The collation type
 */
export interface MySQLHints<
	TType extends string = string,
	TCharset extends string = string,
	TCollation extends string = string,
> extends Omit<DatabaseStorageHints, 'collation'> {
	/**
	 * Direct type override for MySQL
	 */
	type?: TType;

	/**
	 * Character set for text fields
	 */
	charset?: TCharset;

	/**
	 * Collation for text fields (MySQL-specific collation)
	 */
	collation?: TCollation;

	/**
	 * Whether to use UNSIGNED for numeric types
	 */
	unsigned?: boolean;

	/**
	 * Whether this field uses AUTO_INCREMENT
	 */
	autoIncrement?: boolean;

	/**
	 * Whether to use ZEROFILL for numeric types
	 */
	zerofill?: boolean;

	/**
	 * Bit precision for integer types
	 */
	bits?: 8 | 16 | 24 | 32 | 64;
}

/**
 * PostgreSQL-specific field hints
 * @template TType The PostgreSQL-specific column type
 * @template TOpClass The operator class type
 */
export interface PostgresHints<
	TType extends string = string,
	TOpClass extends string = string,
> extends DatabaseStorageHints {
	/**
	 * Direct type override for PostgreSQL
	 */
	type?: TType;

	/**
	 * Whether to use SERIAL types for auto-incrementing
	 */
	useSerial?: boolean;

	/**
	 * Use a specific operator class for indexes on this field
	 */
	opClass?: TOpClass;

	/**
	 * Whether to include time in date fields
	 */
	includeTime?: boolean;

	/**
	 * Whether this field should use the UUID type
	 */
	uuid?: boolean;

	/**
	 * Schema name for the table
	 */
	schema?: string;
}

/**
 * Database hints for fields with options specific to various database systems
 * @template TCustom The type for custom database-specific options
 * @template TSQLiteType The SQLite-specific type options
 * @template TMySQLType The MySQL-specific type options
 * @template TPostgresType The PostgreSQL-specific type options
 */
export interface DatabaseHints<
	TCustom extends Record<string, any> = Record<string, any>,
	TSQLiteType extends SQLiteTypeOption = SQLiteTypeOption,
	TMySQLType extends string = string,
	TPostgresType extends string = string,
> extends DatabaseStorageHints {
	/**
	 * Custom database-specific options
	 */
	custom?: TCustom;

	/**
	 * SQLite-specific hints
	 */
	sqlite?: SQLiteHints<TSQLiteType>;

	/**
	 * MySQL-specific hints
	 */
	mysql?: MySQLHints<TMySQLType>;

	/**
	 * PostgreSQL-specific hints
	 */
	postgres?: PostgresHints<TPostgresType>;

	/**
	 * Whether this field is a primary key
	 * This property is used by adapters but not in the base DatabaseHints type
	 */
	primaryKey?: boolean;

	/**
	 * Integer type flag
	 */
	integer?: boolean;

	/**
	 * Whether this field should auto-increment
	 */
	autoIncrement?: boolean;

	/**
	 * Maximum length for string fields
	 */
	maxLength?: number;
}
