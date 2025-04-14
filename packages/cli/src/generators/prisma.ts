import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Field } from '@c15t/backend/pkgs/data-model/fields';
import { getConsentTables } from '@c15t/backend/schema';
import { produceSchema } from '@mrleebo/prisma-ast';

import { capitalizeFirstLetter } from '../utils/capitalize-first-letter';
import type { SchemaGenerator } from './types';

interface TableDefinition {
	modelName: string;
	fields: Record<string, Field>;
}

export const generatePrismaSchema: SchemaGenerator = async ({
	adapter,
	options,
	file,
}) => {
	const provider = adapter.options?.provider || 'postgresql';
	const tables = getConsentTables(options) as unknown as Record<
		string,
		TableDefinition
	>;
	const filePath = file || './prisma/schema.prisma';
	const schemaPrismaExist = existsSync(path.join(process.cwd(), filePath));
	let schemaPrisma = '';
	if (schemaPrismaExist) {
		schemaPrisma = await fs.readFile(
			path.join(process.cwd(), filePath),
			'utf-8'
		);
	} else {
		schemaPrisma = getNewPrisma(provider);
	}

	// Create a map to store many-to-many relationships
	const manyToManyRelations = new Map<string, Set<string>>();

	// First pass: identify many-to-many relationships
	for (const table in tables) {
		if (Object.hasOwn(tables, table)) {
			const fields = tables[table]?.fields;

			for (const field in fields) {
				if (Object.hasOwn(fields, field)) {
					const attr = fields[field];
					if (attr?.references) {
						const referencedModel = capitalizeFirstLetter(
							attr.references.model
						);
						if (!manyToManyRelations.has(referencedModel)) {
							manyToManyRelations.set(referencedModel, new Set());
						}
						manyToManyRelations
							.get(referencedModel)
							?.add(capitalizeFirstLetter(table));
					}
				}
			}
		}
	}

	const schema = produceSchema(schemaPrisma, (builder) => {
		// Define the Prisma type mapping function
		function getPrismaType(
			type: string,
			isOptional: boolean,
			isBigint: boolean
		): string {
			// Detect JSON fields based on type only
			const isJsonField = type === 'json' || type === 'jsonb';

			// Handle JSON type first - convert based on database provider
			if (isJsonField) {
				if (provider === 'postgresql' || provider === 'mysql') {
					return isOptional ? 'Json?' : 'Json';
				}
				// For SQLite, fallback to String since it doesn't support JSON natively
				return isOptional ? 'String?' : 'String @map("json_as_text")';
			}

			if (type === 'string') {
				return isOptional ? 'String?' : 'String';
			}
			if (type === 'number' && isBigint) {
				return isOptional ? 'BigInt?' : 'BigInt';
			}
			if (type === 'number') {
				return isOptional ? 'Int?' : 'Int';
			}
			if (type === 'boolean') {
				return isOptional ? 'Boolean?' : 'Boolean';
			}
			if (type === 'date') {
				return isOptional ? 'DateTime?' : 'DateTime';
			}
			if (type === 'string[]') {
				return 'String[]';
			}
			if (type === 'number[]') {
				return 'Int[]';
			}
			return 'String'; // Default fallback
		}

		// Process each table to create models
		for (const table in tables) {
			if (Object.hasOwn(tables, table)) {
				const fields = tables[table]?.fields;
				const originalTable = tables[table]?.modelName;
				const modelName = capitalizeFirstLetter(originalTable || table);

				// Check if model already exists
				const prismaModel = builder.findByType('model', { name: modelName });

				// Create model if it doesn't exist
				if (!prismaModel) {
					if (provider === 'mongodb') {
						builder
							.model(modelName)
							.field('id', 'String')
							.attribute('id')
							.attribute(`map("_id")`);
					} else {
						builder.model(modelName).field('id', 'String').attribute('id');
					}
				}

				// Add fields to the model
				for (const field in fields) {
					if (Object.hasOwn(fields, field)) {
						const attr = fields[field];

						// Skip if field already exists
						const existingField = builder.findByType('field', {
							name: field,
							within: prismaModel?.properties,
						});

						if (existingField) {
							continue;
						}

						if (!attr) {
							continue;
						}

						// Add the field with proper type
						builder
							.model(modelName)
							.field(
								field,
								getPrismaType(attr.type, !attr?.required, attr?.bigint || false)
							);

						// Add unique attribute if needed
						if (attr.unique) {
							builder.model(modelName).blockAttribute(`unique([${field}])`);
						}

						// Add relation if needed
						if (attr.references) {
							builder
								.model(modelName)
								.field(
									`${attr.references.model.toLowerCase()}`,
									capitalizeFirstLetter(attr.references.model)
								)
								.attribute(
									`relation(fields: [${field}], references: [${attr.references.field}], onDelete: Cascade)`
								);
						}

						// Special handling for MySQL text fields
						if (
							!attr.unique &&
							!attr.references &&
							provider === 'mysql' &&
							attr.type === 'string'
						) {
							builder.model(modelName).field(field).attribute('db.Text');
						}
					}
				}

				// Add mapping attribute if needed
				if (originalTable && originalTable !== modelName) {
					const hasMapAttribute = builder.findByType('attribute', {
						name: 'map',
						within: prismaModel?.properties,
					});

					if (!hasMapAttribute) {
						builder.model(modelName).blockAttribute('map', originalTable);
					}
				}
			}
		}

		// Add many-to-many relations
		for (const [
			referencedModel,
			relatedModels,
		] of manyToManyRelations.entries()) {
			for (const relatedModel of relatedModels) {
				const fieldName = `${relatedModel.toLowerCase()}s`;
				const model = builder.findByType('model', { name: referencedModel });

				if (model) {
					const existingField = builder.findByType('field', {
						name: fieldName,
						within: model.properties,
					});

					if (!existingField) {
						builder
							.model(referencedModel)
							.field(fieldName, `${relatedModel}[]`);
					}
				}
			}
		}
	});

	return {
		code: schema.trim() === schemaPrisma.trim() ? '' : schema,
		fileName: filePath,
	};
};

const getNewPrisma = (provider: string) => `generator client {
    provider = "prisma-client-js"
  }
  
  datasource db {
    provider = "${provider}"
    url      = ${
			provider === 'sqlite' ? `"file:./dev.db"` : `env("DATABASE_URL")`
		}
  }`;
