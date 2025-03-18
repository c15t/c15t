import { existsSync } from 'node:fs';
import type { Field } from '@c15t/backend/pkgs/data-model/fields';
import { getConsentTables } from '@c15t/backend/schema';
import type { SchemaGenerator } from './types';

export function convertToSnakeCase(str: string) {
	// Guard against undefined or null strings
	if (str === undefined || str === null) {
		return '';
	}
	return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export const generateDrizzleSchema: SchemaGenerator = async ({
	options,
	file,
	adapter,
}) => {
	const tables = getConsentTables(options);
	const filePath = file || './auth-schema.ts';
	const databaseType = adapter.options?.provider;
	const usePlural = adapter.options?.usePlural;
	const timestampAndBoolean =
		databaseType !== 'sqlite' ? 'timestamp, boolean' : '';
	const int = databaseType === 'mysql' ? 'int' : 'integer';
	const hasBigint = Object.values(tables).some((table) =>
		Object.values(table.fields).some(
			(field) => 'bigint' in field && field.bigint
		)
	);
	const bigint = databaseType !== 'sqlite' ? 'bigint' : '';
	const text = databaseType === 'mysql' ? 'varchar, text' : 'text';
	// Add JSON type import for MySQL and PostgreSQL
	const jsonType = ['mysql', 'pg'].includes(databaseType || '') ? ', json' : '';
	let code = `import { ${databaseType}Table, ${text}, ${int}${
		hasBigint ? `, ${bigint}` : ''
	}, ${timestampAndBoolean}${jsonType} } from "drizzle-orm/${databaseType}-core";`;

	const fileExist = existsSync(filePath);

	// Track if this is the first table to avoid adding a newline before it
	let isFirstTable = true;

	for (const table in tables) {
		if (Object.prototype.hasOwnProperty.call(tables, table)) {
			// Use the table name as fallback if modelName is undefined
			let modelName = usePlural
				? `${tables[table].modelName}s`
				: tables[table].modelName;

			if (!modelName) {
				modelName = table;
			}

			const fields = tables[table].fields;

			function getMySQLStringType(field: Field, name: string): string {
				if (field.unique) {
					return `varchar('${name}', { length: 255 })`;
				}
				if (field.references) {
					return `varchar('${name}', { length: 36 })`;
				}
				return `text('${name}')`;
			}

			function getType(fieldName: string, field: Field) {
				const snakeCaseName = convertToSnakeCase(fieldName);
				const type = field.type;
				const typeMap = {
					string: {
						sqlite: `text('${snakeCaseName}')`,
						pg: `text('${snakeCaseName}')`,
						mysql: getMySQLStringType(field, snakeCaseName),
					},
					boolean: {
						sqlite: `integer('${snakeCaseName}', { mode: 'boolean' })`,
						pg: `boolean('${snakeCaseName}')`,
						mysql: `boolean('${snakeCaseName}')`,
					},
					number: {
						sqlite: `integer('${snakeCaseName}')`,
						pg:
							'bigint' in field && field.bigint
								? `bigint('${snakeCaseName}', { mode: 'number' })`
								: `integer('${snakeCaseName}')`,
						mysql:
							'bigint' in field && field.bigint
								? `bigint('${snakeCaseName}', { mode: 'number' })`
								: `int('${snakeCaseName}')`,
					},
					date: {
						sqlite: `integer('${snakeCaseName}', { mode: 'timestamp' })`,
						pg: `timestamp('${snakeCaseName}')`,
						mysql: `timestamp('${snakeCaseName}')`,
					},
					// Add JSON type support
					json: {
						sqlite: `text('${snakeCaseName}')`, // SQLite uses TEXT for JSON
						pg: `json('${snakeCaseName}')`, // PostgreSQL native JSON
						mysql: `json('${snakeCaseName}')`, // MySQL native JSON
					},
				} as const;

				// Check if type exists in typeMap
				if (!typeMap[type as keyof typeof typeMap]) {
					// Default to string type if unknown
					return `text('${snakeCaseName}')`;
				}

				// Default database type to sqlite if not valid
				const dbType =
					databaseType && ['sqlite', 'pg', 'mysql'].includes(databaseType)
						? databaseType
						: 'sqlite';

				return typeMap[type as keyof typeof typeMap][
					dbType as keyof (typeof typeMap)[keyof typeof typeMap]
				];
			}

			const id =
				databaseType === 'mysql'
					? `varchar("id", { length: 36 }).primaryKey()`
					: `text("id").primaryKey()`;

			const tableNameForSQL = convertToSnakeCase(modelName);

			// Add a newline before each table except the first one
			if (isFirstTable) {
				// Add newline after the import
				code += '\n\n';
				isFirstTable = false;
			} else {
				code += '\n\n';
			}

			const schema = `export const ${modelName} = ${databaseType}Table("${tableNameForSQL}", {
  id: ${id},
${Object.keys(fields)
	.map((field) => {
		if (Object.prototype.hasOwnProperty.call(fields, field)) {
			const attr = fields[field];
			return `  ${field}: ${getType(field, attr)}${
				attr.required ? '.notNull()' : ''
			}${attr.unique ? '.unique()' : ''}${
				attr.references
					? `.references(()=> ${
							usePlural ? `${attr.references.model}s` : attr.references.model
						}.${attr.references.field}, { onDelete: 'cascade' })`
					: ''
			}`;
		}
		return '';
	})
	.filter(Boolean)
	.join(',\n')}
});`;
			code += schema;
		}
	}

	return {
		code: code,
		fileName: filePath,
		overwrite: fileExist,
	};
};
