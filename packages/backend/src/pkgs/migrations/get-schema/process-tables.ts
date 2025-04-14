import type { Field } from '~/pkgs/data-model';
import type { C15TDBSchema } from '~/schema/definition';
import { processFields } from './process-fields';
import type { SchemaDefinition } from './types';

/**
 * Processes table definitions into a structured schema
 *
 * This function transforms the raw table definitions into a formal schema structure,
 * handling field processing, references, and merging of table definitions.
 *
 * @param tables - Raw table definitions from the consent module
 * @returns A structured schema definition
 */
export function processTablesIntoSchema(
  tables: C15TDBSchema
): SchemaDefinition {
  const schema: SchemaDefinition = {};

  // Process each table in the tables collection
  for (const [key, table] of Object.entries(tables)) {
    // Skip undefined tables
    if (!table) {
      continue;
    }

    // Process the fields for this table
    let actualFields: Record<string, Field>;
    try {
      const fields = table.fields;
      if (typeof fields !== 'object' || fields === null) {
        // biome-ignore lint/suspicious/noConsole: its okay
        console.warn(
          `Invalid fields for table ${key}: Expected object, got ${typeof fields}`
        );
        continue;
      }
      actualFields = processFields(fields, tables);
    } catch (error) {
      // biome-ignore lint/suspicious/noConsole: its okay
      console.error(`Error processing fields for table ${key}:`, error);
      continue; // Skip this table if field processing fails
    }

    // Determine the model name (use the key if EntityName is not specified)
    const EntityName = table.entityName || key;

    // Update existing schema entry or create a new one
    if (schema[EntityName]) {
      // Merge with existing schema entry if one exists
      schema[EntityName] = {
        ...schema[EntityName],
        fields: {
          ...schema[EntityName]?.fields,
          ...actualFields,
        },
      };
    } else {
      // Create a new schema entry
      schema[EntityName] = {
        fields: actualFields,
        order: table.order || Number.POSITIVE_INFINITY, // Default to lowest priority
      };
    }
  }

  return schema;
}
