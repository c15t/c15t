import type { EntityName, Field } from '~/pkgs/data-model';
import { getConsentTables } from '~/schema/definition';
import type { C15TOptions } from '~/types';
import type { TableDefinition } from './types';

/**
 * A schema entry representing a processed entity definition.
 * Contains fields and creation/sorting order information.
 *
 * @internal
 * @interface SchemaEntry
 * @property {Record<string, Field>} fields - Map of field names to their definitions
 * @property {number} order - Order priority for entity creation (lower numbers first)
 */
interface SchemaEntry {
	fields: Record<string, Field>;
	order: number;
}

/**
 * Processes entity definitions from configuration into a standardized schema format.
 *
 * This function takes raw configuration and builds a complete schema with properly
 * structured field definitions, handling field name mapping, references between
 * entities, and merging duplicate entity definitions.
 *
 * @param {C15TOptions} config - The application configuration
 * @returns {Record<string, SchemaEntry>} A map of entity names to their schema entries
 *
 * @example
 * ```typescript
 * const schema = getSchema(config);
 *
 * // Access subject entity definition
 * const subjectFields = schema.subject.fields;
 * ```
 */
export function getSchema(config: C15TOptions) {
	const entities = getConsentTables(config);
	const schema: Record<string, SchemaEntry> = {};

	for (const [key, entity] of Object.entries(entities)) {
		if (!entity) {
			continue; // Skip if entity is undefined
		}

		const fields = entity.fields || {}; // Default to empty object if fields is undefined
		const processedFields: Record<string, Field> = {};

		// Process each field
		for (const [fieldKey, field] of Object.entries(fields)) {
			if (!field) {
				continue; // Skip if field is undefined
			}

			const fieldName = field.fieldName || fieldKey;
			// Cast field to Field to ensure it has the right type
			const typedField = field as Field;
			processedFields[fieldName] = typedField;

			// Handle references - first check if the field has a references property
			if (typedField && 'references' in typedField && typedField.references) {
				const entityName = typedField.references.model as EntityName;
				const referencedEntity = entities[entityName];
				if (referencedEntity) {
					// Create a new object for references to avoid modifying the original
					processedFields[fieldName] = {
						...typedField,
						references: {
							model: referencedEntity.entityName,
							entity: referencedEntity.entityName,
							field: typedField.references.field,
							onDelete: typedField.references.onDelete,
						},
					};
				}
			}
		}

		// Update or create schema entry
		const entityName = entity.entityName || key;
		if (entityName in schema) {
			const existingEntry = schema[entityName];

			schema[entityName] = {
				...existingEntry,
				order: existingEntry?.order ?? Number.POSITIVE_INFINITY,
				fields: {
					...existingEntry?.fields,
					...processedFields,
				},
			};
		} else {
			schema[entityName] = {
				fields: processedFields,
				order: entity.order ?? Number.POSITIVE_INFINITY,
			};
		}
	}

	return schema;
}

/**
 * Get schema for a specific table
 *
 * @param schemaDefinition - The complete schema definition
 * @param tableName - The name of the table to get schema for
 * @returns The table definition or undefined if not found
 */
export function getSchemaForTable(
	schemaDefinition: Record<string, TableDefinition>,
	tableName: string
): TableDefinition | undefined {
	return schemaDefinition[tableName];
}

/**
 * Get schema for an entity by its entity name
 *
 * @param schemaDefinition - The complete schema definition
 * @param entityName - The entity name to look for
 * @returns The table definition or undefined if not found
 */
export function getSchemaForEntity(
	schemaDefinition: Record<string, TableDefinition>,
	entityName: string
): TableDefinition | undefined {
	return Object.values(schemaDefinition).find(
		(tableDefinition) => tableDefinition.entityName === entityName
	);
}
