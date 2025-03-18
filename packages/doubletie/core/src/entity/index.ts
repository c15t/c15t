/**
 * Entity module exports
 * @module entity
 */

// Entity definition exports
export { defineEntity } from './entity';
export { createRelationshipHelpers } from './relationship';

// Entity types
export type {
	EntityFields,
	EntityStructure,
	EntityFromDefinition,
	EntityWithRelationships,
	WithRelationships,
} from './entity.types';

// Relationship types
export type {
	RelationshipType,
	RelationshipConfig,
	EntityFieldReference,
	RelationshipHelpers,
	BasicRelationshipOptions,
	ManyToManyOptions,
} from './relationship.types';
