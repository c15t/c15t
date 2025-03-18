import type { RelationType } from '../constants/relation-type';
/**
 * Utilities to help with defining models in a type-safe manner
 * Provides functions and types for building structured model schemas
 *
 * @module model-builder
 */
import type {
	ModelExtensions,
	ModelSchema,
	PrimaryKeySpecification,
} from '../model';

/**
 * Relation definition for model relationships
 *
 * @typeParam TParentEntity - Type of the parent model
 * @typeParam TRelatedEntity - Type of the related model
 */
export type RelationDefinition<TParentEntity, TRelatedEntity> = {
	/** The type of relation (HasMany, BelongsTo, etc.) */
	type: (typeof RelationType)[keyof typeof RelationType];
	/** Name of the related model's table */
	model: string;
	/** Column in the parent table that links to the relation */
	from: keyof TParentEntity & string;
	/** Column in the related table that links to the parent */
	to: keyof TRelatedEntity & string;
	/** Configuration for many-to-many relationships */
	through?: {
		/** Junction table name */
		model: string;
		/** Column in junction table that links to parent */
		from: string;
		/** Column in junction table that links to related table */
		to: string;
	};
	/** Additional filter conditions for the relation */
	filter?: Record<string, unknown>;
};

/**
 * Field definition for model fields with type information
 */
export type FieldDefinition = {
	/** Data type of the field */
	type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'binary' | string;
	/** Whether the field can be null */
	nullable?: boolean;
	/** Default value for the field */
	defaultValue?: unknown;
	/** Maximum length for string fields */
	length?: number;
	/** Validation rules for the field */
	validate?: {
		/** Minimum value for numbers or length for strings */
		min?: number;
		/** Maximum value for numbers or length for strings */
		max?: number;
		/** Regular expression pattern for validation */
		pattern?: RegExp;
		/** Custom validation function */
		custom?: (value: unknown) => boolean | string;
	};
};

/**
 * Helper function to define a model field with type information
 *
 * @param type - Field data type
 * @param options - Additional field options
 * @returns Complete field definition
 *
 * @example
 * ```typescript
 * const nameField = field('string', { nullable: false });
 * const createdAtField = field('date', { defaultValue: new Date() });
 * ```
 */
export function field(
	type: FieldDefinition['type'],
	options: Omit<FieldDefinition, 'type'> = {}
): FieldDefinition {
	return {
		type,
		...options,
	};
}

/**
 * Helper function to define a complete model schema with proper typing
 *
 * @typeParam TEntity - Type of the model being defined
 * @param config - Model schema configuration
 * @returns A typed model schema
 *
 * @example
 * ```typescript
 * const userSchema = defineSchema<User>({
 *   fields: {
 *     id: field('number', { nullable: false }),
 *     name: field('string'),
 *     email: field('string')
 *   },
 *   relations: {
 *     posts: relation(RelationType.HasManyRelation, {
 *       model: 'posts',
 *       from: 'id',
 *       to: 'userId'
 *     })
 *   }
 * });
 * ```
 */
export function defineSchema<TEntity>(config: {
	fields: { [TKey in keyof TEntity]: FieldDefinition };
	relations?: {
		[TRelationName in string]: RelationDefinition<TEntity, unknown>;
	};
	indexes?: Array<{
		name?: string;
		columns: Array<keyof TEntity & string>;
		unique?: boolean;
	}>;
	extensions?: ModelExtensions<TEntity>;
}): ModelSchema<TEntity> {
	return config as ModelSchema<TEntity>;
}

/**
 * Helper function to define a primary key for a model
 *
 * @typeParam TEntity - Type of the model
 * @param field - Primary key field name
 * @param options - Additional options for the primary key
 * @returns Primary key specification
 *
 * @example
 * ```typescript
 * const userPrimaryKey = primaryKey<User>('id', { autoIncrement: true });
 * const postPrimaryKey = primaryKey<Post>('id', { type: 'uuid' });
 * ```
 */
export function primaryKey<TEntity>(
	field: keyof TEntity & string,
	options: Omit<PrimaryKeySpecification<TEntity>, 'field'> = {}
): PrimaryKeySpecification<TEntity> {
	return {
		field,
		...options,
	};
}

/**
 * Helper function to define a complete model registry
 *
 * @typeParam TDatabase - Database schema type
 * @param models - Model definitions by table name
 * @returns Fully typed model registry
 *
 * @example
 * ```typescript
 * const models = defineModels<DB>({
 *   users: {
 *     schema: userSchema,
 *     primaryKey: userPrimaryKey
 *   },
 *   posts: {
 *     schema: postSchema,
 *     primaryKey: postPrimaryKey
 *   }
 * });
 * ```
 */
export function defineModels<TDatabase>(
	models: {
		[TTableName in keyof TDatabase & string]?: {
			schema: ModelSchema<TDatabase[TTableName]>;
			primaryKey: PrimaryKeySpecification<TDatabase[TTableName]>;
		};
	}
) {
	return models;
}

/**
 * Helper to define a relation between models
 *
 * @typeParam TParentEntity - Type of the parent model
 * @typeParam TRelatedEntity - Type of the related model
 * @param type - Type of relation to create
 * @param config - Configuration for the relation
 * @returns Fully configured relation definition
 *
 * @example
 * ```typescript
 * const userPostsRelation = relation<User, Post>(
 *   RelationType.HasManyRelation,
 *   {
 *     model: 'posts',
 *     from: 'id',
 *     to: 'userId'
 *   }
 * );
 * ```
 */
export function relation<TParentEntity, TRelatedEntity>(
	type: (typeof RelationType)[keyof typeof RelationType],
	config: Omit<RelationDefinition<TParentEntity, TRelatedEntity>, 'type'>
): RelationDefinition<TParentEntity, TRelatedEntity> {
	return {
		type,
		...config,
	};
}

/**
 * Type helper to extract a model type from the database
 *
 * @typeParam TDatabase - Database schema type
 * @typeParam TTableName - Name of the table
 */
export type ModelType<
	TDatabase,
	TTableName extends keyof TDatabase & string,
> = TDatabase[TTableName];
