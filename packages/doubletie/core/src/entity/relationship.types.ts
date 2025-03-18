import type { FieldValueType } from '../schema/schema.types';
import type { EntityStructure } from './entity.types';

/**
 * Types of relationships between entities
 */
export type RelationshipType =
	| 'oneToOne'
	| 'oneToMany'
	| 'manyToOne'
	| 'manyToMany';

/**
 * Cascade options for deletes and updates
 */
export type CascadeOption =
	| 'CASCADE'
	| 'RESTRICT'
	| 'SET NULL'
	| 'SET DEFAULT'
	| 'NO ACTION';

/**
 * Fetch strategy for relationships
 */
export type FetchStrategy = 'lazy' | 'eager';

/**
 * Basic options for one-to-one and many-to-one relationships
 */
export interface BasicRelationshipOptions {
	/**
	 * Foreign key field name in the source entity
	 */
	foreignKey?: string;

	/**
	 * Whether to cascade deletes
	 */
	cascade?: boolean;

	/**
	 * Whether to fetch the relationship eagerly or lazily
	 */
	fetch?: FetchStrategy;

	/**
	 * On delete action
	 */
	onDelete?: CascadeOption;

	/**
	 * On update action
	 */
	onUpdate?: CascadeOption;
}

/**
 * Join table configuration for many-to-many relationships
 */
export interface JoinTableConfig {
	/**
	 * Name of the join table
	 */
	name: string;

	/**
	 * Source column name in the join table
	 */
	sourceColumn: string;

	/**
	 * Target column name in the join table
	 */
	targetColumn: string;

	/**
	 * Additional columns in the join table
	 */
	additionalColumns?: Record<string, FieldValueType>;
}

/**
 * Options for many-to-many relationships
 */
export interface ManyToManyOptions {
	/**
	 * Target field name (defaults to 'id')
	 */
	targetField?: string;

	/**
	 * Join table configuration
	 */
	joinTable?: string | JoinTableConfig;

	/**
	 * Whether to cascade deletes
	 */
	cascade?: boolean;

	/**
	 * Whether to fetch the relationship eagerly or lazily
	 */
	fetch?: FetchStrategy;

	/**
	 * On delete action
	 */
	onDelete?: CascadeOption;

	/**
	 * On update action
	 */
	onUpdate?: CascadeOption;
}

/**
 * Common base for all relationship configurations
 */
interface BaseRelationshipConfig {
	/**
	 * Type of relationship
	 */
	type: RelationshipType;

	/**
	 * Whether to cascade deletes
	 */
	cascade?: boolean;

	/**
	 * Whether to fetch the relationship eagerly or lazily
	 */
	fetch?: FetchStrategy;

	/**
	 * On delete action
	 */
	onDelete?: CascadeOption;

	/**
	 * On update action
	 */
	onUpdate?: CascadeOption;
}

/**
 * Configuration for a one-to-one relationship
 */
export interface OneToOneConfig extends BaseRelationshipConfig {
	type: 'oneToOne';
	foreignKey: string;
	inverseForeignKey?: string;
}

/**
 * Configuration for a one-to-many relationship
 */
export interface OneToManyConfig extends BaseRelationshipConfig {
	type: 'oneToMany';
	foreignKey: string;
}

/**
 * Configuration for a many-to-one relationship
 */
export interface ManyToOneConfig extends BaseRelationshipConfig {
	type: 'manyToOne';
	foreignKey: string;
}

/**
 * Configuration for a many-to-many relationship
 */
export interface ManyToManyConfig extends BaseRelationshipConfig {
	type: 'manyToMany';
	joinTable: string | JoinTableConfig;
}

/**
 * Union type for all relationship configurations
 */
export type RelationshipConfig =
	| OneToOneConfig
	| OneToManyConfig
	| ManyToOneConfig
	| ManyToManyConfig;

/**
 * Reference to an entity field
 */
export interface EntityFieldReference<
	TSourceEntity extends EntityStructure = EntityStructure,
	TTargetEntity extends EntityStructure = EntityStructure,
	TTargetField extends keyof TTargetEntity['fields'] & string = string,
> {
	/**
	 * Target entity name
	 */
	entity: string;
	/**
	 * Target entity field
	 */
	field: TTargetField;
	/**
	 * Relationship configuration
	 */
	relationship?: RelationshipConfig;
}

/**
 * Relationship helper methods to create type-safe relationships
 */
export interface RelationshipHelpers<TSourceEntity extends EntityStructure> {
	/**
	 * Create a reference to a field in another entity
	 */
	ref<
		TTargetEntity extends EntityStructure,
		TTargetField extends keyof TTargetEntity['fields'] & string,
	>(
		entity: TTargetEntity,
		field: TTargetField
	): EntityFieldReference<TSourceEntity, TTargetEntity, TTargetField>;

	/**
	 * Create a many-to-one relationship to another entity
	 */
	manyToOne<
		TTargetEntity extends EntityStructure,
		TTargetField extends keyof TTargetEntity['fields'] &
			string = keyof TTargetEntity['fields'] & string,
	>(
		entity: TTargetEntity,
		field?: TTargetField,
		options?: BasicRelationshipOptions
	): EntityFieldReference<TSourceEntity, TTargetEntity, TTargetField>;

	/**
	 * Create a one-to-one relationship to another entity
	 */
	oneToOne<
		TTargetEntity extends EntityStructure,
		TTargetField extends keyof TTargetEntity['fields'] &
			string = keyof TTargetEntity['fields'] & string,
	>(
		entity: TTargetEntity,
		field?: TTargetField,
		options?: BasicRelationshipOptions & { inverseForeignKey?: string }
	): EntityFieldReference<TSourceEntity, TTargetEntity, TTargetField>;

	/**
	 * Create a one-to-many relationship to another entity
	 */
	oneToMany<
		TTargetEntity extends EntityStructure,
		TTargetField extends keyof TTargetEntity['fields'] &
			string = keyof TTargetEntity['fields'] & string,
	>(
		entity: TTargetEntity,
		options: BasicRelationshipOptions & { targetField?: TTargetField }
	): EntityFieldReference<TSourceEntity, TTargetEntity, TTargetField>;

	/**
	 * Create a many-to-many relationship with another entity via a join table
	 */
	manyToMany<
		TTargetEntity extends EntityStructure,
		TTargetField extends keyof TTargetEntity['fields'] &
			string = keyof TTargetEntity['fields'] & string,
	>(
		entity: TTargetEntity,
		options: ManyToManyOptions
	): EntityFieldReference<TSourceEntity, TTargetEntity, TTargetField>;
}
