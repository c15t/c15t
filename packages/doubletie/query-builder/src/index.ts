export {
	NoResultError,
	sql,
	type Selectable,
	type Insertable,
	type Updateable,
	type SelectQueryBuilder,
	type NotNull,
	type JSONOperatorWith$,
	// reexport dialects
	PostgresDialect,
	MysqlDialect,
	SqliteDialect,
} from 'kysely';

// Export the main classes, types and utilities
export { createDatabase } from './database';

export * from './database.types';

export * from './model';

export { generateId } from './id-generator';

// Export SQL Fragments utilities (new in 0.27.2)
export {
	insertAndReturnUserIds,
	updateUserAndGetAuditClause,
	deleteInactiveUsersAndCount,
} from './utils/sql-fragments';

// Export Type-Safe Model Building API
export {
	field,
	defineSchema,
	primaryKey,
	defineModels,
	relation,
	type RelationDefinition,
	type FieldDefinition,
	type ModelType,
} from './utils/model-builder';

// Helper function to provide type inference utilities
const createTypeInferenceHelpers = () => {
	return {
		// Empty placeholder implementation
		// This exists only to make the exports below not type-only
		__typeInferenceHelpers: true,
	};
};

// Export Type Inference Utilities as part of a named export
export const TypeInference = {
	...createTypeInferenceHelpers(),
	// The actual types are exported via type keyword
};

// Type-only exports
export type {
	InferDatabaseSchema,
	ExtractModelType,
	ModelInsertType,
	ModelUpdateType,
	ModelSelectType,
	ExtractKeysOfType,
	RequireKeys,
	NonNullableFields,
	RequiredFields,
	WithOptional,
	WithRequired,
	ValidationErrors,
	FieldMapping,
} from './utils/type-inference';
