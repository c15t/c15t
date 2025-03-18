import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { DatabaseConfig } from '../config/config.types';
import { mergeSchemaWithConfig } from '../db/merge';
import { generateTable } from '../db/table';
import type { TableDefinition, TableOptions } from '../db/table';
import type {
	EntitySchemaDefinition,
	FieldValueType,
	ResolvedField,
} from '../schema/schema.types';
import {
	assertCondition,
	isDatabaseConfig,
	isEntitySchemaDefinition,
	isResolvedEntitySchema,
	isStandardSchema,
} from '../utils/type-guards';
import type { EntityInput } from '../utils/type-infer';
import { convertValueToFieldType } from '../validation/type-conversion';
import {
	validateEntity,
	validateEntityWithFieldValidators,
} from '../validation/validate';
import type {
	EntityFieldsMap,
	EntityFromDefinition,
	EntityStructure,
	EntityWithRelationships,
	SchemaFields,
	TypedRelationshipReference,
} from './entity.types';
import { createRelationshipHelpers } from './relationship';
import type { RelationshipHelpers } from './relationship.types';

// Type alias to prevent circular reference issues
type EntityType<
	TSchema extends EntitySchemaDefinition,
	TValidator extends StandardSchemaV1<unknown, Record<string, FieldValueType>>,
> = EntityFromDefinition<TSchema, TValidator>;

/**
 * Define a new entity with validation and relationships
 * @param schema The entity schema definition
 * @param validator Optional schema validator
 * @param config Optional database configuration
 * @returns The entity definition with methods for validation and relationships
 */
export function defineEntity<
	TSchema extends EntitySchemaDefinition,
	TValidator extends StandardSchemaV1<
		unknown,
		Record<string, FieldValueType>
	> = StandardSchemaV1<unknown, Record<string, FieldValueType>>,
>(
	schema: TSchema,
	validator?: TValidator,
	config?: DatabaseConfig
): EntityFromDefinition<TSchema, TValidator> {
	// Validate schema with type guards
	assertCondition(
		isEntitySchemaDefinition(schema),
		`Invalid entity schema: schema must have 'name' and 'fields' properties`
	);

	// Validate validator if provided
	if (validator) {
		assertCondition(
			isStandardSchema(validator),
			`Invalid validator: must be a StandardSchema with '~standard.validate' method`
		);
	}

	// Validate config if provided
	if (config) {
		assertCondition(
			isDatabaseConfig(config),
			`Invalid database config: must have 'adapter' property`
		);
	}

	// Create the base entity structure
	const baseEntity = {
		name: schema.name,
		prefix: '',
		fields: { ...schema.fields },
		config: {},
		order: 0,
		validator,
		description: schema.description,
	};

	// Create a resolved entity based on configuration if provided
	let resolved: ReturnType<typeof mergeSchemaWithConfig> | undefined;

	function resolveWithConfig(runtimeConfig: DatabaseConfig) {
		assertCondition(
			isDatabaseConfig(runtimeConfig),
			`Invalid runtime database config: must have 'adapter' property`
		);

		if (!resolved) {
			resolved = mergeSchemaWithConfig(baseEntity, runtimeConfig);
		}
		return resolved;
	}

	// Create the entity with explicit type annotation to avoid circular reference
	const entity: EntityType<TSchema, TValidator> = {
		...baseEntity,

		// Validate data against the entity schema
		validate: async <TInput extends StandardSchemaV1.InferInput<TValidator>>(
			data: TInput
		): Promise<EntityFieldsMap<SchemaFields<TSchema>>> => {
			const entityDef =
				resolved || (config ? resolveWithConfig(config) : baseEntity);

			// Ensure data is in the correct format for validation
			const dataToValidate =
				data === null || data === undefined
					? {}
					: typeof data === 'object'
						? data
						: { value: data };

			// Use field-level validators when there's no explicit validator
			if (!validator) {
				// When no validator is provided, perform field-level validation with proper typing
				const validatedData = await validateEntityWithFieldValidators(
					dataToValidate as Record<string, FieldValueType>,
					schema
				);

				// Return the validated data with proper type
				return validatedData as EntityFieldsMap<SchemaFields<TSchema>>;
			}

			// When using an explicit validator, validate with the schema first
			const result = await validateEntity(validator, dataToValidate);

			// Ensure the data has correct types based on field definitions
			const typedResult: Record<string, FieldValueType> = {};

			// Process any required field conversions
			for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
				// Include all fields from the validated data if they exist
				if (result && typeof result === 'object' && fieldName in result) {
					const fieldValue = (result as Record<string, FieldValueType>)[
						fieldName
					];

					// Apply automated type conversions based on field type
					typedResult[fieldName] = convertValueToFieldType(
						fieldValue,
						fieldDef,
						fieldName
					);
				}
			}

			// Return the result with the correct EntityFieldsMap type
			return typedResult as EntityFieldsMap<SchemaFields<TSchema>>;
		},

		// Type references for TypeScript autocompletion
		type: {} as EntityInput<EntityType<TSchema, TValidator>>,
		outputType: {} as EntityFieldsMap<SchemaFields<TSchema>>,

		// Generate a table definition with improved typing
		getTable: <TOptions extends TableOptions = TableOptions>(
			runtimeConfig?: DatabaseConfig
		): TableDefinition<TOptions> => {
			// If config is provided, use mergeSchemaWithConfig to properly format the entity
			let entityDef:
				| ReturnType<typeof mergeSchemaWithConfig>
				| {
						entityName: string;
						entityPrefix: string;
						fields: Record<string, ResolvedField>;
						validator?: TValidator;
						description?: string;
				  };

			if (resolved) {
				entityDef = resolved;
			} else if (runtimeConfig) {
				entityDef = resolveWithConfig(runtimeConfig);
			} else {
				// If no config, use a default resolved schema shape for the base entity
				entityDef = {
					entityName: baseEntity.name,
					entityPrefix: baseEntity.prefix || '',
					fields: Object.entries(baseEntity.fields).reduce(
						(acc, [key, field]) => {
							acc[key] = {
								...field,
								fieldName: key,
							} as ResolvedField;
							return acc;
						},
						{} as Record<string, ResolvedField>
					),
					validator: baseEntity.validator,
					description: baseEntity.description,
				};
			}

			// Verify we have a valid resolved entity schema using type guard
			assertCondition(
				isResolvedEntitySchema(entityDef),
				`Invalid entity definition: missing required properties for table generation`
			);

			// Generate the table definition
			return generateTable(entityDef) as TableDefinition<TOptions>;
		},

		// Builder pattern for type-safe relationships
		withRelationships: function <
			TRel extends Record<string, TypedRelationshipReference<EntityStructure>>,
		>(
			relationshipFn: (
				helpers: RelationshipHelpers<EntityType<TSchema, TValidator>>
			) => TRel
		): EntityWithRelationships<EntityType<TSchema, TValidator>, TRel> {
			// Create relationship helpers instance
			const selfEntity = this as EntityType<TSchema, TValidator>;
			const helpers = createRelationshipHelpers(selfEntity);
			const typedHelpers = helpers as RelationshipHelpers<
				EntityType<TSchema, TValidator>
			>;

			// Get relationships from the function
			const relationships = relationshipFn(typedHelpers);

			// Validate relationships
			assertCondition(
				relationships && typeof relationships === 'object',
				`Invalid relationships: must return an object of relationship definitions`
			);

			// Create entity with relationships with proper typing
			const entityWithRelationships: EntityWithRelationships<
				EntityType<TSchema, TValidator>,
				TRel
			> = {
				...this,
				relationships,
			};

			return entityWithRelationships;
		},
	};

	return entity;
}
