import type { Field, FieldType } from '~/pkgs/data-model';
import type { KyselyDatabaseType } from '~/pkgs/db-adapters/adapters/kysely-adapter/types';

/**
 * Type mappings for PostgreSQL
 * Maps c15t field types to PostgreSQL-specific column types
 */
const postgresMap = {
	string: ['character varying', 'text'],
	number: [
		'int4',
		'integer',
		'bigint',
		'smallint',
		'numeric',
		'real',
		'double precision',
	],
	boolean: ['bool', 'boolean'],
	date: ['timestamp', 'date'],
	json: ['json', 'jsonb'],
	timezone: ['text', 'character varying'], // Timezone stored as text in PostgreSQL
};

/**
 * Type mappings for MySQL
 * Maps c15t field types to MySQL-specific column types
 */
const mysqlMap = {
	string: ['varchar(255)', 'varchar(36)', 'text'], // Common MySQL string variants
	number: [
		'integer',
		'int',
		'bigint',
		'smallint',
		'decimal',
		'float',
		'double',
	],
	boolean: ['boolean', 'tinyint'],
	date: ['timestamp', 'datetime', 'date'],
	json: ['json'],
	timezone: ['varchar(50)'], // Fixed length for timezone strings
};

/**
 * Type mappings for SQLite
 * Maps c15t field types to SQLite-specific column types
 */
const sqliteMap = {
	string: ['TEXT'],
	number: ['INTEGER', 'REAL'],
	boolean: ['INTEGER', 'BOOLEAN'], // 0 or 1
	date: ['DATE', 'INTEGER'],
	json: ['TEXT'], // SQLite doesn't have native JSON, stored as TEXT
	timezone: ['TEXT'], // Timezone stored as text in SQLite
};
/**
 * Type mappings for Microsoft SQL Server
 * Maps c15t field types to MSSQL-specific column types
 *
 * @remarks
 * For double-precision floating point values, MSSQL uses FLOAT(53) which is
 * equivalent to DOUBLE PRECISION in other databases. We map both 'double' and
 * 'float' to the appropriate MSSQL types.
 */
const mssqlMap = {
	string: ['text', 'varchar'],
	number: ['int', 'bigint', 'smallint', 'decimal', 'float(53)', 'float(24)'],
	boolean: ['bit', 'smallint'],
	date: ['datetime', 'date'],
	json: ['nvarchar(max)'], // MSSQL uses nvarchar for JSON storage
	timezone: ['varchar', 'text'], // Timezone stored as text in MSSQL
};

/**
 * All database type mappings
 * Provides a unified interface to access type mappings for all supported databases
 */
const map = {
	postgres: postgresMap,
	mysql: mysqlMap,
	sqlite: sqliteMap,
	mssql: mssqlMap,
} as const;

/**
 * Determines MySQL string type based on field attributes
 *
 * @param field - Field attributes including unique and references properties
 * @returns The appropriate MySQL type for the string field
 *
 * @example
 * ```typescript
 * // Returns 'varchar(255)' for unique fields
 * getMySqlStringType({ type: 'string', unique: true });
 *
 * // Returns 'varchar(36)' for reference fields
 * getMySqlStringType({ type: 'string', references: 'subjects' });
 *
 * // Returns 'text' for regular string fields
 * getMySqlStringType({ type: 'string' });
 * ```
 */
export function getMySqlStringType(field: Field): string {
	if (field.unique) {
		return 'varchar(255)';
	}
	if (field.references) {
		return 'varchar(36)';
	}
	return 'text';
}

/**
 * Checks if a database column type matches the expected field type
 *
 * @param columnDataType - The actual column type in the database
 * @param fieldType - The expected field type from c15t
 * @param dbType - The database type (postgres, mysql, etc.)
 * @returns True if types match, false otherwise
 *
 * @remarks
 * This function handles type compatibility across different databases,
 * accounting for the fact that the same logical type may have different
 * names in different database systems.
 *
 * Array types (string[] and number[]) are treated specially and matched
 * against JSON-compatible column types.
 *
 * @example
 * ```typescript
 * // Returns true because 'text' is compatible with 'string' in PostgreSQL
 * matchType('text', 'string', 'postgres');
 *
 * // Returns true because 'jsonb' is compatible with array types
 * matchType('jsonb', 'string[]', 'postgres');
 * ```
 */
export function matchType(
	columnDataType: string,
	fieldType: FieldType,
	dbType: KyselyDatabaseType
): boolean {
	if (fieldType === 'string[]' || fieldType === 'number[]') {
		return columnDataType.toLowerCase().includes('json');
	}
	const types = map[dbType as keyof typeof map];
	const type = Array.isArray(fieldType)
		? types.string.map((t) => t.toLowerCase())
		: types[fieldType].map((t) => t.toLowerCase());
	const matches = type.includes(columnDataType.toLowerCase());
	return matches;
}

/**
 * Gets the appropriate database type for a field
 *
 * @param field - Field attributes including type and other properties
 * @param dbType - Database type to get the appropriate type for
 * @returns The appropriate database-specific type
 *
 * @remarks
 * This function determines the most appropriate database type for a given field,
 * taking into account:
 * - The field's base type (string, number, boolean, etc.)
 * - Special attributes (unique, references, bigint)
 * - Database-specific requirements and best practices
 *
 * @example
 * ```typescript
 * // Returns 'text' for a regular string field in SQLite
 * getType({ type: 'string' }, 'sqlite');
 *
 * // Returns 'jsonb' for a JSON field in PostgreSQL
 * getType({ type: 'json' }, 'postgres');
 *
 * // Returns 'bigint' for a number field with bigint flag
 * getType({ type: 'number', bigint: true }, 'mysql');
 * ```
 */
export function getType(field: Field, dbType: KyselyDatabaseType = 'sqlite') {
	const type = field.type;
	const typeMap = {
		string: {
			sqlite: 'text',
			postgres: 'text',
			mysql: getMySqlStringType(field),
			mssql: getMySqlStringType(field),
		},
		boolean: {
			sqlite: 'integer',
			postgres: 'boolean',
			mysql: 'boolean',
			mssql: 'smallint',
		},
		number: {
			sqlite: field.bigint ? 'bigint' : 'integer',
			postgres: field.bigint ? 'bigint' : 'integer',
			mysql: field.bigint ? 'bigint' : 'integer',
			mssql: field.bigint ? 'bigint' : 'integer',
		},
		date: {
			sqlite: 'date',
			postgres: 'timestamp',
			mysql: 'datetime',
			mssql: 'datetime',
		},
		timezone: {
			sqlite: 'text',
			postgres: 'text',
			mysql: 'varchar(50)',
			mssql: 'nvarchar(50)',
		},
		json: {
			sqlite: 'text', // SQLite doesn't have native JSON
			postgres: 'jsonb', // PostgreSQL prefers jsonb for better performance
			mysql: 'json',
			mssql: 'nvarchar(max)', // SQL Server stores JSON as nvarchar
		},
	} as const;

	if (dbType === 'sqlite' && (type === 'string[]' || type === 'number[]')) {
		return 'text';
	}
	if (type === 'string[]' || type === 'number[]') {
		switch (dbType) {
			case 'postgres':
				return 'jsonb';
			case 'mysql':
			case 'mssql':
				return 'json';
			default:
				return 'text';
		}
	}

	// Handle json type
	if (type === 'json') {
		return typeMap.json[dbType as keyof typeof typeMap.json];
	}

	return typeMap[type as keyof typeof typeMap][
		dbType as keyof (typeof typeMap)[keyof typeof typeMap]
	];
}
