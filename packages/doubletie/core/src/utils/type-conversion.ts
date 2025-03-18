import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { EntityFromDefinition } from '../entity/entity.types';
import type {
	EntitySchemaDefinition,
	FieldValueType,
} from '../schema/schema.types';

/**
 * Convert EntityFromDefinition to EntitySchemaDefinition
 * This is needed for compatibility with database adapters
 * @param entity - The entity to convert
 * @returns The converted entity schema definition
 */
export function toEntitySchemaDefinition<T extends EntityFromDefinition>(
	entity: T
): EntitySchemaDefinition {
	// Validate the entity has the required properties
	if (!entity || typeof entity !== 'object') {
		throw new Error('Invalid entity: must be an object');
	}

	if (!entity.name || typeof entity.name !== 'string') {
		throw new Error('Invalid entity: must have a name property of type string');
	}

	if (!entity.fields || typeof entity.fields !== 'object') {
		throw new Error(
			'Invalid entity: must have a fields property of type object'
		);
	}

	// Create the schema definition with proper type checking
	const result: EntitySchemaDefinition = {
		name: entity.name,
		fields: entity.fields,
		description:
			typeof entity.description === 'string' || entity.description === undefined
				? entity.description
				: undefined,
	};

	// Add optional properties with type checking
	if (entity.prefix && typeof entity.prefix === 'string') {
		result.prefix = entity.prefix;
	}

	if (
		entity.config &&
		typeof entity.config === 'object' &&
		entity.config !== null
	) {
		result.config = entity.config as Record<string, FieldValueType>;
	}

	if (typeof entity.order === 'number') {
		result.order = entity.order;
	}

	if (
		entity.validator &&
		typeof entity.validator === 'object' &&
		'~standard' in entity.validator &&
		typeof entity.validator['~standard'] === 'object' &&
		typeof entity.validator['~standard'].validate === 'function'
	) {
		result.validator = entity.validator;
	}

	return result;
}
