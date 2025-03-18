import type { Field } from '~/pkgs/data-model';
import { DoubleTieError, ERROR_CODES } from '~/pkgs/results';
import type { C15TOptions, C15TPluginSchema } from '~/types';

/**
 * Parses and transforms output data according to schema field definitions.
 *
 * This function filters and processes entity data being returned from the database,
 * ensuring that only fields marked as returnable are included in the output.
 *
 * @typeParam EntityType - The type of entity being processed
 *
 * @param data - The raw data object retrieved from the database
 * @param schema - The schema containing field definitions
 * @param schema.fields - Record of field definitions for the entity
 *
 * @returns The processed data object with appropriate fields included or excluded
 *
 * @example
 * ```typescript
 * // Get subject data from database
 * const subjectData = { id: 'sub_x1pftyoufsm7xgo1kv', };
 *
 * // Define schema with password field marked as not returnable
 * const subjectSchema = {
 *   fields: {
 *     id: { name: 'id', type: 'string', returned: true },
 *   }
 * };
 *
 * // Process the data - password will be excluded
 * const processedData = parseEntityOutputData(subjectData, subjectSchema);
 * // Result: { id: 'sub_x1pftyoufsm7xgo1kv',}
 * ```
 *
 * @remarks
 * - Fields marked with `returned: false` will be excluded from the output
 * - Fields not found in the schema will be passed through unchanged
 * - The function preserves the original type of the input data
 */
export function parseEntityOutputData<
	EntityType extends Record<string, unknown>,
>(
	data: EntityType,
	schema: {
		fields: Record<string, Field>;
	}
) {
	const fields = schema.fields;
	const parsedData: Record<string, unknown> = {};

	for (const key in data) {
		if (Object.hasOwn(data, key)) {
			const field = fields[key];
			if (!field) {
				parsedData[key] = data[key];
				continue;
			}
			if (field.returned === false) {
				continue;
			}
			parsedData[key] = data[key];
		}
	}
	return parsedData as EntityType;
}

/**
 * Type representing a field conflict resolution strategy
 */
export type FieldConflictResolution = {
	/**
	 * How to handle conflicting field definitions
	 * - 'error': Throw an error when conflicts are detected
	 * - 'warn': Log a warning and use the last definition
	 * - 'silent': Silently use the last definition
	 */
	strategy: 'error' | 'warn' | 'silent';

	/**
	 * Optional callback for logging warnings
	 * Only used when strategy is 'warn'
	 */
	onWarning?: (message: string) => void;
};

/**
 * Retrieves all fields for a specific table, combining base configuration and plugin fields
 *
 * @param options - The C15T configuration options
 * @param table - The table name to get fields for
 * @param conflictResolution - How to handle conflicting field definitions
 * @returns Combined fields from configuration and plugins
 *
 * @throws {DoubleTieError} When field conflicts are detected and strategy is 'error'
 *
 * @example
 * ```typescript
 * // Get fields with conflict resolution
 * const fields = getAllFields(options, 'subject', {
 *   strategy: 'warn',
 *   onWarning: (msg) => console.warn(msg)
 * });
 * ```
 */
export function getAllFields(
	options: C15TOptions,
	table: string,
	conflictResolution: FieldConflictResolution = { strategy: 'error' }
) {
	const schema: Record<string, Field> = {};
	const fieldOrigins = new Map<string, string[]>();

	// Helper to track field origins and handle conflicts
	const addFields = (fields: Record<string, Field>, source: string) => {
		for (const [key, field] of Object.entries(fields)) {
			if (schema[key]) {
				const origins = fieldOrigins.get(key) || [];
				origins.push(source);
				fieldOrigins.set(key, origins);

				// Handle conflict based on strategy
				if (conflictResolution.strategy === 'error') {
					throw new DoubleTieError(
						'A field conflict was detected in the schema. Multiple definitions exist for the same field.',
						{
							code: ERROR_CODES.CONFLICT,
							status: 500,
							data: {
								field: key,
								table,
								definedIn: origins.join(', '),
							},
						}
					);
				}
				if (
					conflictResolution.strategy === 'warn' &&
					conflictResolution.onWarning
				) {
					conflictResolution.onWarning(
						`Field conflict detected for '${key}' in table '${table}'. Using last definition from ${source}.`
					);
				}
			}
			schema[key] = field;
		}
	};

	// Get additional fields from the tables configuration if available
	if (options.tables && table in options.tables) {
		const tableConfig = options.tables[table as keyof typeof options.tables];
		if (tableConfig?.additionalFields) {
			addFields(tableConfig.additionalFields, 'table configuration');
		}
	}

	// Add fields from plugins
	for (const plugin of options.plugins || []) {
		const pluginSchema = plugin.schema as C15TPluginSchema | undefined;
		if (pluginSchema?.[table]) {
			addFields(
				pluginSchema[table].fields,
				`plugin: ${plugin.name || 'unnamed'}`
			);
		}
	}

	return schema;
}

/**
 * Configuration for handling extra fields in input data
 */
export type ExtraFieldsConfig = {
	/**
	 * How to handle fields not defined in the schema
	 * - 'error': Throw an error when extra fields are detected
	 * - 'warn': Log a warning and include the fields
	 * - 'silent': Silently include the fields
	 * - 'drop': Silently drop the fields
	 */
	strategy: 'error' | 'warn' | 'silent' | 'drop';

	/**
	 * Optional callback for logging warnings
	 * Only used when strategy is 'warn'
	 */
	onWarning?: (message: string) => void;

	/**
	 * Optional list of field names that are always allowed
	 * regardless of schema definition
	 */
	allowedExtraFields?: string[];
};

/**
 * Parses and validates input data according to schema field definitions.
 *
 * This function processes data being sent to the database, ensuring it meets
 * schema requirements by:
 * - Validating required fields
 * - Applying transformations
 * - Setting default values
 * - Handling field-specific validation
 *
 * @typeParam EntityType - The type of entity being processed
 *
 * @param data - The input data to validate and transform
 * @param schema - The schema to validate against
 * @param schema.fields - Record of field definitions
 * @param schema.action - The current operation ('create' or 'update')
 * @param extraFieldsConfig - How to handle fields not defined in the schema
 *
 * @returns The validated and transformed data
 *
 * @throws {DoubleTieError} When a required field is missing during creation
 * @throws {DoubleTieError} When extra fields are detected and strategy is 'error'
 *
 * @example
 * ```typescript
 * // Input data from client
 * const inputData = {
 *   email: 'subject@example.com',
 *   role: 'subject',
 *   extraField: 'value' // Field not in schema
 * };
 *
 * // Schema with field definitions
 * const subjectSchema = {
 *   fields: {
 *     id: {
 *       name: 'id',
 *       type: 'string',
 *       defaultValue: () => crypto.randomUUID()
 *     },
 *     email: {
 *       name: 'email',
 *       type: 'string',
 *       required: true,
 *       transform: {
 *         input: (value) => value.toLowerCase()
 *       }
 *     },
 *     role: {
 *       name: 'role',
 *       type: 'string',
 *       defaultValue: 'subject'
 *     },
 *     createdAt: {
 *       name: 'created_at',
 *       type: 'date',
 *       defaultValue: () => new Date(),
 *       input: false
 *     }
 *   },
 *   action: 'create'
 * };
 *
 * // Process the data with extra fields config
 * const validatedData = parseInputData(inputData, subjectSchema, {
 *   strategy: 'warn',
 *   onWarning: (msg) => console.warn(msg),
 *   allowedExtraFields: ['metadata']
 * });
 * ```
 *
 * @remarks
 * - During 'create' operations, required fields must be present or an error is thrown
 * - Default values are only applied during 'create' operations
 * - Fields marked with `input: false` are excluded unless they have a default value
 * - The function handles both modern transform functions and legacy validators
 */
export function parseInputData<EntityType extends Record<string, unknown>>(
	data: EntityType,
	schema: {
		fields: Record<string, Field>;
		action?: 'create' | 'update';
	},
	extraFieldsConfig: ExtraFieldsConfig = { strategy: 'error' }
) {
	const action = schema.action || 'create';
	const fields = schema.fields;
	const parsedData: Record<string, unknown> = {};

	// Track extra fields for potential errors/warnings
	const extraFields = new Set<string>();

	// Process schema-defined fields
	for (const key in fields) {
		if (Object.hasOwn(fields, key)) {
			if (key in data) {
				if (fields[key]?.input === false) {
					if (fields[key]?.defaultValue) {
						parsedData[key] = fields[key]?.defaultValue;
						continue;
					}
					continue;
				}
				// Check if validator exists and is an object with input property (old style)
				function isLegacyValidator(
					validator: unknown
				): validator is { input?: { parse: (value: unknown) => unknown } } {
					return (
						typeof validator === 'object' &&
						validator !== null &&
						'input' in validator
					);
				}

				if (
					fields[key]?.validator &&
					isLegacyValidator(fields[key]?.validator) &&
					fields[key]?.validator.input &&
					data[key] !== undefined
				) {
					parsedData[key] = fields[key]?.validator.input.parse(data[key]);
					continue;
				}
				if (fields[key]?.transform?.input && data[key] !== undefined) {
					const inputValue = data[key] as
						| string
						| number
						| boolean
						| Date
						| string[]
						| number[];
					parsedData[key] = fields[key]?.transform?.input(inputValue);
					continue;
				}
				parsedData[key] = data[key];
				continue;
			}

			if (fields[key]?.defaultValue && action === 'create') {
				parsedData[key] = fields[key]?.defaultValue;
				continue;
			}

			if (fields[key]?.required && action === 'create') {
				throw new DoubleTieError('Missing required field', {
					code: ERROR_CODES.BAD_REQUEST,
					status: 400,
					data: {
						message: `${key} is required`,
					},
				});
			}
		}
	}

	// Handle extra fields
	for (const key in data) {
		if (Object.hasOwn(data, key) && !(key in fields)) {
			extraFields.add(key);
		}
	}

	// Process extra fields based on configuration
	if (extraFields.size > 0) {
		const allowedFields = new Set(extraFieldsConfig.allowedExtraFields || []);
		const unallowedFields = Array.from(extraFields).filter(
			(field) => !allowedFields.has(field)
		);

		if (unallowedFields.length > 0) {
			switch (extraFieldsConfig.strategy) {
				case 'error':
					throw new DoubleTieError('Unexpected fields found', {
						code: ERROR_CODES.BAD_REQUEST,
						status: 400,
						data: {
							message: `Unexpected fields found: ${unallowedFields.join(', ')}`,
						},
					});
				case 'warn': {
					if (extraFieldsConfig.onWarning) {
						extraFieldsConfig.onWarning(
							`Unexpected fields found: ${unallowedFields.join(', ')}`
						);
					}
					// Include all extra fields
					for (const key of extraFields) {
						parsedData[key] = data[key];
					}
					break;
				}
				case 'silent':
					// Include all extra fields
					for (const key of extraFields) {
						parsedData[key] = data[key];
					}
					break;
				case 'drop':
					// Fields are already dropped, no action needed
					break;
				default:
					// Default to error strategy for type safety
					throw new DoubleTieError('Unexpected fields found', {
						code: ERROR_CODES.BAD_REQUEST,
						status: 400,
						data: {
							message: `Unexpected fields found: ${unallowedFields.join(', ')}`,
						},
					});
			}
		} else {
			// Include allowed extra fields
			for (const key of extraFields) {
				parsedData[key] = data[key];
			}
		}
	}

	return parsedData as Partial<EntityType>;
}
