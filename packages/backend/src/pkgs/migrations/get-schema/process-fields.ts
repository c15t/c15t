import type { EntityName, Field } from '~/pkgs/data-model';
import type { C15TDBSchema } from '~/schema/definition';

/**
 * Processes field definitions for a table
 *
 * This function handles field attributes, field name mappings, and references
 * to other tables. It ensures that all fields are properly configured and
 * references are correctly set up.
 *
 * @param fields - Raw field definitions from the table
 * @param tables - All available tables for resolving references
 * @returns Processed field definitions
 */
export function processFields<T extends EntityName>(
  fields: C15TDBSchema[T]['fields'],
  tables: C15TDBSchema
): Record<string, Field> {
  const actualFields: Record<string, Field> = {};

  // Process each field in the fields collection
  for (const [fieldKey, field] of Object.entries(fields)) {
    // Skip undefined fields
    if (!field) {
      continue;
    }

    // Use the specified fieldName or the key if fieldName is not provided
    const fieldName = field.fieldName || fieldKey;

    // Cast field to Field to ensure it has the right type
    const typedField = field as Field;
    actualFields[fieldName as keyof typeof actualFields] = typedField;

    // Handle references to other tables - first check if the field has a references property
    if (typedField && 'references' in typedField && typedField.references) {
      const EntityName = typedField.references.model as EntityName;
      const refTable = tables[EntityName];

      // Only set up the reference if the referenced table exists
      if (refTable) {
        // Create a new object for references to avoid modifying the original
        actualFields[fieldName as keyof typeof actualFields] = {
          ...typedField,
          references: {
            model: refTable.entityName,
            entity: refTable.entityName,
            field: typedField.references.field,
            onDelete: typedField.references.onDelete,
          },
        };
      } else {
        // Log warning and remove invalid reference if table not found
        // biome-ignore lint/suspicious/noConsole: no Logger implementation
        console.warn(
          `Warning: Referenced table '${EntityName}' not found for field '${fieldName}'. The reference will be removed to prevent inconsistent state.`
        );
        const { references, ...fieldWithoutRef } = typedField;
        actualFields[fieldName as keyof typeof actualFields] = fieldWithoutRef;
      }
    }
  }

  return actualFields;
}
