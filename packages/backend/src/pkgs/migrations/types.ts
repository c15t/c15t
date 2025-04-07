import type {
	AlterTableColumnAlteringBuilder,
	CreateTableBuilder,
} from 'kysely';
import type { Field } from '~/pkgs/data-model';

/**
 * Type representing a table to be created during migration
 */
export interface TableToCreate {
	table: string;
	fields: Record<string, Field>;
	order: number;
}

/**
 * Type representing table columns to be added during migration
 */
export interface ColumnsToAdd {
	table: string;
	fields: Record<string, Field>;
	order: number;
}

/**
 * Type for migration operations
 */
export type MigrationOperation =
	| AlterTableColumnAlteringBuilder
	| CreateTableBuilder<string, string>;

/**
 * Result of migration generation
 */
export interface MigrationResult {
	toBeCreated: TableToCreate[];
	toBeAdded: ColumnsToAdd[];
	runMigrations: () => Promise<void>;
	compileMigrations: () => Promise<string>;
}

/**
 * Re-export TableSchemaDefinition from get-schema
 */
export type {
	SchemaDefinition,
	TableSchemaDefinition,
} from './get-schema/types';
