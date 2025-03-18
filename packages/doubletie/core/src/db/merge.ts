import type {
	DatabaseConfig,
	EntityOverrideConfig,
} from '../config/config.types';
import type { EntitySchemaDefinition } from '../schema/schema.types';
import type {
	FieldValueType,
	ResolvedField,
	SchemaField,
} from '../schema/schema.types';

/**
 * Resolved entity schema with merged config
 */
export type ResolvedEntitySchema<T extends EntitySchemaDefinition> = {
	entityName: string;
	entityPrefix: string;
	fields: Record<string, ResolvedField>;
	order?: number;
	validator?: T['validator'];
};

/**
 * Merge a schema definition with database configuration
 * @param baseSchema The base schema to merge
 * @param config The database configuration to apply
 * @returns A resolved entity schema with merged config
 */
export function mergeSchemaWithConfig<T extends EntitySchemaDefinition>(
	baseSchema: T,
	config: DatabaseConfig
): ResolvedEntitySchema<T> {
	// Find entity override from config tables
	const entityConfig = config.tables?.[baseSchema.name];

	return {
		entityName: entityConfig?.entityName || baseSchema.name,
		entityPrefix: entityConfig?.entityPrefix || baseSchema.prefix || '',
		order: baseSchema.order || 0,
		validator: baseSchema.validator,
		fields: mergeFields(baseSchema.fields, entityConfig, config),
	};
}

/**
 * Merge base schema fields with configuration overrides
 * @param baseFields Base schema fields
 * @param entityConfig Entity config overrides
 * @param fullConfig Full database config
 * @returns Merged field definitions
 */
function mergeFields(
	baseFields: Record<string, SchemaField>,
	entityConfig?: EntityOverrideConfig,
	fullConfig?: DatabaseConfig
): Record<string, ResolvedField> {
	const result: Record<string, ResolvedField> = {};

	// Process base fields and apply any overrides
	for (const [fieldName, fieldDef] of Object.entries(baseFields)) {
		// Check for alias (string) or full override (object)
		const alias = entityConfig?.fieldAliases?.[fieldName];
		const override = entityConfig?.fieldOverrides?.[fieldName];

		// Determine the field override - prioritize full override over alias
		const fieldOverride =
			override || (alias ? { fieldName: alias } : undefined);

		// Set field with overrides
		result[fieldName] = {
			...fieldDef,
			fieldName: fieldOverride?.fieldName || fieldName,
			required:
				fieldOverride?.required !== undefined
					? fieldOverride.required
					: fieldDef.required,
			defaultValue:
				fieldOverride?.defaultValue !== undefined
					? fieldOverride.defaultValue
					: fieldDef.defaultValue,
			relationship:
				fieldDef.relationship && fieldOverride?.relationship
					? {
							...fieldDef.relationship,
							entity:
								fieldOverride.relationship?.model ||
								fieldDef.relationship.entity,
							field:
								fieldOverride.relationship?.field ||
								fieldDef.relationship.field,
						}
					: fieldDef.relationship,
			validator: fieldDef.validator,
		};

		// Handle transforms that might depend on config values
		if (
			fieldDef.transform?.input &&
			typeof fieldDef.transform.input === 'function'
		) {
			result[fieldName].transform = {
				...fieldDef.transform,
				input: (val: FieldValueType): FieldValueType => {
					// Pass config values to transform functions
					const originalInput = fieldDef.transform!.input!;
					return originalInput(val);
				},
			};
		}
	}

	// Add additional fields from config
	if (entityConfig?.additionalFields) {
		for (const [fieldName, fieldDef] of Object.entries(
			entityConfig.additionalFields
		)) {
			result[fieldName] = {
				...fieldDef,
				fieldName: fieldName,
			};
		}
	}

	return result;
}
