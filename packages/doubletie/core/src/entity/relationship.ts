import {
	assertCondition,
	assertType,
	isEntityStructure,
	isObject,
} from '../utils/type-guards';
import type {
	InferEntityFromReference,
	InferFieldFromReference,
} from '../utils/type-infer';
import type { EntityStructure } from './entity.types';
import type {
	BasicRelationshipOptions,
	EntityFieldReference,
	JoinTableConfig,
	ManyToManyConfig,
	ManyToManyOptions,
	ManyToOneConfig,
	OneToManyConfig,
	OneToOneConfig,
	RelationshipHelpers,
} from './relationship.types';

/**
 * Error thrown when relationship validation fails
 */
export class RelationshipError extends Error {
	constructor(message: string) {
		super(message);
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, RelationshipError);
		}
		this.name = 'RelationshipError';
	}
}

/**
 * Validate that a field exists in an entity
 * @param entity The entity to check
 * @param field The field name to validate
 * @param entityRole Description of the entity's role for error messages
 * @throws {RelationshipError} If the field doesn't exist
 */
function validateFieldExists(
	entity: EntityStructure,
	field: string,
	entityRole: string
): void {
	assertCondition(
		field in entity.fields,
		`Field '${field}' does not exist in ${entityRole} entity '${entity.name}'`
	);
}

/**
 * Create a many-to-one relationship configuration
 */
function createManyToOneConfig(
	entity: EntityStructure,
	options?: BasicRelationshipOptions
): ManyToOneConfig {
	const foreignKey = options?.foreignKey || `${entity.name}Id`;

	return {
		type: 'manyToOne',
		foreignKey,
		...options,
	};
}

/**
 * Create a one-to-one relationship configuration
 */
function createOneToOneConfig(
	entity: EntityStructure,
	options?: BasicRelationshipOptions & { inverseForeignKey?: string }
): OneToOneConfig {
	const foreignKey = options?.foreignKey || `${entity.name}Id`;

	return {
		type: 'oneToOne',
		foreignKey,
		inverseForeignKey: options?.inverseForeignKey,
		...options,
	};
}

/**
 * Create a one-to-many relationship configuration
 */
function createOneToManyConfig(
	sourceEntity: EntityStructure,
	options: BasicRelationshipOptions
): OneToManyConfig {
	const foreignKey = options.foreignKey || `${sourceEntity.name}Id`;

	return {
		type: 'oneToMany',
		foreignKey,
		...options,
	};
}

/**
 * Create a many-to-many relationship configuration
 */
function createManyToManyConfig(
	sourceEntity: EntityStructure,
	targetEntity: EntityStructure,
	options: ManyToManyOptions
): ManyToManyConfig {
	// Set up join table configuration if not explicitly provided
	const defaultJoinTableName = `${sourceEntity.name}_${targetEntity.name}`;

	// Use provided join table config or create a default one
	let joinTable: JoinTableConfig | string;

	if (options.joinTable) {
		joinTable = options.joinTable;
	} else {
		// Create default join table config
		joinTable = {
			name: defaultJoinTableName,
			sourceColumn: `${sourceEntity.name}Id`,
			targetColumn: `${targetEntity.name}Id`,
		};
	}

	return {
		type: 'manyToMany',
		joinTable,
		...options,
	};
}

/**
 * Create relationship helpers with a given entity structure
 * @param entityStructure The entity structure to create helpers for
 * @returns Relationship helper methods
 */
export function createRelationshipHelpers<
	TSourceEntity extends EntityStructure,
>(entityStructure: TSourceEntity): RelationshipHelpers<TSourceEntity> {
	// Validate entity structure
	assertType(
		entityStructure,
		isEntityStructure,
		'Invalid entity structure: must have name and fields properties'
	);

	return {
		/**
		 * Create a reference to a field in another entity
		 */
		ref<
			TTargetEntity extends EntityStructure,
			TTargetField extends keyof TTargetEntity['fields'] & string,
		>(
			entity: TTargetEntity,
			field: TTargetField
		): EntityFieldReference<TSourceEntity, TTargetEntity, TTargetField> {
			// Validate entity
			assertType(
				entity,
				isEntityStructure,
				'Invalid target entity: must have name and fields properties'
			);

			// Validate field exists in the target entity
			validateFieldExists(entity, field, 'target');

			return {
				entity: entity.name,
				field,
			};
		},

		/**
		 * Create a many-to-one relationship to another entity
		 */
		manyToOne<
			TTargetEntity extends EntityStructure,
			TTargetField extends keyof TTargetEntity['fields'] &
				string = keyof TTargetEntity['fields'] & string,
		>(
			entity: TTargetEntity,
			field: TTargetField = 'id' as TTargetField,
			options?: BasicRelationshipOptions
		): EntityFieldReference<TSourceEntity, TTargetEntity, TTargetField> {
			// Validate entity
			assertType(
				entity,
				isEntityStructure,
				'Invalid target entity: must have name and fields properties'
			);

			// Validate options if provided
			if (options !== undefined) {
				assertCondition(
					isObject(options),
					'Invalid options: must be an object'
				);
			}

			// Validate field exists
			validateFieldExists(entity, field, 'target');

			// Create relationship config
			const relationship = createManyToOneConfig(entity, options);

			return {
				entity: entity.name,
				field,
				relationship,
			};
		},

		/**
		 * Create a one-to-one relationship to another entity
		 */
		oneToOne<
			TTargetEntity extends EntityStructure,
			TTargetField extends keyof TTargetEntity['fields'] &
				string = keyof TTargetEntity['fields'] & string,
		>(
			entity: TTargetEntity,
			field: TTargetField = 'id' as TTargetField,
			options?: BasicRelationshipOptions & { inverseForeignKey?: string }
		): EntityFieldReference<TSourceEntity, TTargetEntity, TTargetField> {
			// Validate entity
			assertType(
				entity,
				isEntityStructure,
				'Invalid target entity: must have name and fields properties'
			);

			// Validate options if provided
			if (options !== undefined) {
				assertCondition(
					isObject(options),
					'Invalid options: must be an object'
				);
			}

			// Validate field exists
			validateFieldExists(entity, field, 'target');

			// Validate that the inverse foreign key exists in the target entity if it's referencing a field
			if (
				options?.inverseForeignKey &&
				typeof options.inverseForeignKey === 'string'
			) {
				validateFieldExists(entity, options.inverseForeignKey, 'target');
			}

			// Create relationship config
			const relationship = createOneToOneConfig(entity, options);

			return {
				entity: entity.name,
				field,
				relationship,
			};
		},

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
		): EntityFieldReference<TSourceEntity, TTargetEntity, TTargetField> {
			// Validate entity
			assertType(
				entity,
				isEntityStructure,
				'Invalid target entity: must have name and fields properties'
			);

			// Validate options
			assertCondition(isObject(options), 'Invalid options: must be an object');

			const targetField = (options.targetField || 'id') as TTargetField;

			// Validate target field exists
			validateFieldExists(entity, targetField, 'target');

			// Create relationship config
			const relationship = createOneToManyConfig(entityStructure, options);

			// Validate that the foreign key exists in the target entity
			if (typeof relationship.foreignKey === 'string') {
				validateFieldExists(entity, relationship.foreignKey, 'target');
			}

			return {
				entity: entity.name,
				field: targetField,
				relationship,
			};
		},

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
		): EntityFieldReference<TSourceEntity, TTargetEntity, TTargetField> {
			// Validate entity
			assertType(
				entity,
				isEntityStructure,
				'Invalid target entity: must have name and fields properties'
			);

			// Validate options
			assertCondition(isObject(options), 'Invalid options: must be an object');

			// Set up the target field
			const targetField = (options.targetField || 'id') as TTargetField;

			// Validate target field exists
			validateFieldExists(entity, targetField, 'target');

			// Create relationship config
			const relationship = createManyToManyConfig(
				entityStructure,
				entity,
				options
			);

			return {
				entity: entity.name,
				field: targetField,
				relationship,
			};
		},
	};
}

/**
 * Get the referenced entity from a relationship reference
 * @param reference The relationship reference
 * @returns The referenced entity type or null if it can't be determined
 */
export function getReferencedEntity<
	T extends EntityFieldReference<any, any, any>,
>(reference: T): InferEntityFromReference<T> | null {
	if (!reference || typeof reference !== 'object') {
		return null;
	}

	if (!reference.entity || typeof reference.entity !== 'string') {
		return null;
	}

	return reference.entity as unknown as InferEntityFromReference<T>;
}

/**
 * Get the referenced field from a relationship reference
 * @param reference The relationship reference
 * @returns The referenced field name or null if it can't be determined
 */
export function getReferencedField<
	T extends EntityFieldReference<any, any, any>,
>(reference: T): InferFieldFromReference<T> | null {
	if (!reference || typeof reference !== 'object') {
		return null;
	}

	if (!reference.field || typeof reference.field !== 'string') {
		return null;
	}

	return reference.field as unknown as InferFieldFromReference<T>;
}
