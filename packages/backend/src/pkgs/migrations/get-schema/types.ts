import type { Field } from '~/pkgs/data-model';

/**
 * Represents a complete table definition within the schema
 *
 * @property fields - Map of field names to their attribute definitions
 * @property order - Priority order for table creation (lower numbers are created first)
 */
export interface TableSchemaDefinition {
  fields: Record<string, Field>;
  order: number;
}

/**
 * Represents the complete database schema
 * Maps table names to their definitions
 */
export type SchemaDefinition = Record<string, TableSchemaDefinition>;
