import type { FieldValueType } from '../schema/schema.types';
import {
	assertCondition,
	isResolvedEntitySchema,
	isSchemaField,
	isSqlDialect,
} from '../utils/type-guards';
import type { ResolvedEntitySchema } from './merge';

/**
 * SQL dialect types for type-safe dialect selection
 */
export type SqlDialect = 'postgresql' | 'mysql' | 'sqlite';

/**
 * SQL column type mapping for standard SQL data types
 */
export type SqlColumnType =
	| 'VARCHAR'
	| 'TEXT'
	| 'INTEGER'
	| 'BIGINT'
	| 'DECIMAL'
	| 'FLOAT'
	| 'BOOLEAN'
	| 'DATE'
	| 'TIMESTAMP'
	| 'JSON'
	| 'JSONB'
	| 'UUID'
	| 'ARRAY';

/**
 * Options for table configuration
 */
export interface TableOptions extends Record<string, unknown> {
	dialect?: SqlDialect;
	schema?: string;
	timestamps?: boolean;
	softDelete?: boolean;
}

/**
 * Column definition with strong typing
 */
export interface ColumnDefinition<T extends SqlColumnType = SqlColumnType> {
	name: string;
	type: T;
	nullable: boolean;
	defaultValue?: FieldValueType;
	primaryKey?: boolean;
	references?: {
		table: string;
		column: string;
	};
}

/**
 * Table definition with strongly-typed methods for database operations
 */
export interface TableDefinition<
	TOptions extends Record<string, unknown> = TableOptions,
	TName extends string = string,
	TPrefix extends string = string,
	TDialect extends SqlDialect = SqlDialect,
> {
	name: TName;
	prefix: TPrefix;
	primaryKey: string | string[];
	columns: Record<string, ColumnDefinition<SqlColumnType>>;
	getSqlSchema: (dialect?: TDialect) => string;
	mapToDb: <TInput extends Record<string, FieldValueType>>(
		data: TInput
	) => Record<string, FieldValueType>;
	mapFromDb: <TOutput extends Record<string, FieldValueType>>(
		data: Record<string, FieldValueType>
	) => TOutput;
}

/**
 * Map field type to SQL column type
 * @param fieldType Field type from the entity schema
 * @param dialect SQL dialect being used
 * @returns SQL column type for the field
 */
function mapFieldTypeToSqlType(
	fieldType: string,
	dialect: SqlDialect
): SqlColumnType {
	switch (fieldType) {
		case 'string':
			return dialect === 'postgresql' ? 'TEXT' : 'VARCHAR';
		case 'number':
			return 'INTEGER';
		case 'boolean':
			return dialect === 'postgresql' ? 'BOOLEAN' : 'INTEGER';
		case 'date':
			return dialect === 'postgresql' ? 'TIMESTAMP' : 'TIMESTAMP';
		case 'uuid':
			return dialect === 'postgresql' ? 'UUID' : 'VARCHAR';
		case 'json':
			return dialect === 'postgresql' ? 'JSONB' : 'TEXT';
		case 'array':
			return dialect === 'postgresql' ? 'JSONB' : 'TEXT';
		default:
			return 'TEXT';
	}
}

/**
 * Generate SQL schema for the entity definition
 * @param entityDef Entity definition
 * @param dialect SQL dialect to use
 * @returns SQL schema
 */
function generateSqlSchema(
	entityDef: ResolvedEntitySchema<any>,
	dialect: SqlDialect
): string {
	// Validate entity definition
	assertCondition(
		isResolvedEntitySchema(entityDef),
		'Invalid entity definition: missing required properties'
	);

	// Validate dialect
	assertCondition(isSqlDialect(dialect), `Invalid SQL dialect: ${dialect}`);

	// This is a placeholder for actual SQL generation code
	const tableName = `${entityDef.entityPrefix}${entityDef.entityName}`;
	let sql = `CREATE TABLE ${tableName} (\n`;

	// Convert fields to SQL column definitions
	const columns: string[] = [];
	for (const [fieldName, fieldDef] of Object.entries(entityDef.fields)) {
		// Validate field definition
		assertCondition(
			isSchemaField(fieldDef),
			`Invalid field definition for ${fieldName}`
		);

		// Use fieldName directly from the field definition if present, or the key otherwise
		const columnName = fieldDef.fieldName || fieldName;
		const columnType = mapFieldTypeToSqlType(fieldDef.type, dialect);

		// Add nullable constraint
		const nullable = fieldDef.required ? ' NOT NULL' : '';

		// Add column definition
		columns.push(`  ${columnName} ${columnType}${nullable}`);
	}

	sql += columns.join(',\n');
	sql += '\n);';

	return sql;
}

/**
 * Generate a table configuration from entity definition
 * @param entityDef Resolved entity schema
 * @returns Table configuration
 */
export function generateTable<
	TName extends string = string,
	TPrefix extends string = string,
	TOptions extends TableOptions = TableOptions,
>(
	entityDef: ResolvedEntitySchema<any>
): TableDefinition<TOptions, TName, TPrefix> {
	// Validate entity definition
	assertCondition(
		isResolvedEntitySchema(entityDef),
		'Invalid entity definition: missing required properties'
	);

	// Find primary key field(s)
	let primaryKey: string | string[] = 'id';
	const primaryKeys: string[] = [];

	// Collect all primary key fields
	for (const [fieldName, fieldDef] of Object.entries(entityDef.fields)) {
		if (isSchemaField(fieldDef) && fieldDef.primaryKey) {
			// Use fieldName from the definition if available
			const pkName = fieldDef.fieldName || fieldName;
			primaryKeys.push(pkName);
		}
	}

	// Use the collected primary keys
	if (primaryKeys.length === 1) {
		// Safely access the first element which we know exists
		primaryKey = primaryKeys[0]!; // Non-null assertion since we've checked length
	} else if (primaryKeys.length > 1) {
		primaryKey = primaryKeys;
	}
	// If no primary keys found, default "id" remains

	// Create columns record from entity fields
	const columns: Record<string, ColumnDefinition<SqlColumnType>> = {};

	Object.entries(entityDef.fields).forEach(([fieldName, fieldDef]) => {
		// Validate field definition
		assertCondition(
			isSchemaField(fieldDef),
			`Invalid field definition for ${fieldName}`
		);

		let columnType: SqlColumnType;
		switch (fieldDef.type) {
			case 'string':
				columnType = 'VARCHAR';
				break;
			case 'number':
				columnType = 'INTEGER';
				break;
			case 'boolean':
				columnType = 'BOOLEAN';
				break;
			case 'date':
			case 'timestamp':
				columnType = 'TIMESTAMP';
				break;
			case 'uuid':
			case 'id':
				columnType = 'UUID';
				break;
			case 'json':
			case 'array':
				columnType = 'JSONB';
				break;
			default:
				columnType = 'TEXT';
		}

		// Use fieldName from the definition if available, otherwise use the key
		const columnName = fieldDef.fieldName || fieldName;

		columns[columnName] = {
			name: columnName,
			type: columnType,
			nullable: !fieldDef.required,
			primaryKey: fieldDef.primaryKey || false,
			defaultValue: fieldDef.defaultValue,
		};

		// Add foreign key references if a relationship is defined
		if (fieldDef.relationship) {
			const relationship = fieldDef.relationship;

			if (
				'foreignKey' in relationship &&
				typeof relationship.foreignKey === 'string'
			) {
				columns[relationship.foreignKey] = {
					name: relationship.foreignKey,
					type: 'UUID', // Assuming foreign keys are UUIDs
					nullable: !fieldDef.required,
					references: {
						table: relationship.entity || '',
						column: relationship.field || 'id',
					},
				};
			}
		}
	});

	return {
		name: entityDef.entityName as TName,
		prefix: entityDef.entityPrefix as TPrefix,
		primaryKey,
		columns,

		// SQL schema generation
		getSqlSchema: (dialect: SqlDialect = 'postgresql') => {
			return generateSqlSchema(entityDef, dialect);
		},

		// Field mapping for database operations
		mapToDb: <TInput extends Record<string, FieldValueType>>(data: TInput) => {
			const result: Record<string, FieldValueType> = {};

			for (const [logicalName, fieldDef] of Object.entries(entityDef.fields)) {
				// Validate field definition
				assertCondition(
					isSchemaField(fieldDef),
					`Invalid field definition for ${logicalName}`
				);

				// Map logical field name to physical field name
				const dbFieldName = fieldDef.fieldName || logicalName;

				if (data[logicalName] !== undefined) {
					// Apply any input transformations
					let value: FieldValueType = data[logicalName];
					if (fieldDef.transform?.input) {
						const inputTransform = fieldDef.transform.input;
						value =
							typeof inputTransform === 'function'
								? (inputTransform(value) as FieldValueType)
								: value;
					}

					result[dbFieldName] = value;
				} else if (fieldDef.defaultValue !== undefined) {
					// Apply default value if available
					const defaultValue =
						typeof fieldDef.defaultValue === 'function'
							? (fieldDef.defaultValue() as FieldValueType)
							: (fieldDef.defaultValue as FieldValueType);
					result[dbFieldName] = defaultValue;
				}
			}

			return result;
		},

		// Map data from database back to entity shape
		mapFromDb: <TOutput extends Record<string, FieldValueType>>(
			data: Record<string, FieldValueType>
		) => {
			const result = {} as TOutput;

			for (const [logicalName, fieldDef] of Object.entries(entityDef.fields)) {
				// Validate field definition
				assertCondition(
					isSchemaField(fieldDef),
					`Invalid field definition for ${logicalName}`
				);

				// Map physical field name to logical field name
				const dbFieldName = fieldDef.fieldName || logicalName;

				if (data[dbFieldName] !== undefined) {
					// Apply any output transformations
					let value: FieldValueType = data[dbFieldName];
					if (fieldDef.transform?.output) {
						const outputTransform = fieldDef.transform.output;
						value =
							typeof outputTransform === 'function'
								? (outputTransform(value) as FieldValueType)
								: value;
					}

					// Ensure result has the right structure for TypeScript
					result[logicalName as keyof TOutput] =
						value as TOutput[keyof TOutput];
				}
			}

			return result;
		},
	};
}
