import { EntityName, Field, Primitive } from './core-types';
import type {
	ComparisonOperator,
	LogicalConnector,
	SortOptions,
	Where,
	WhereCondition,
} from './types';

/**
 * Applies the default value of a field if the provided value is undefined or null.
 * Used in create and update operations to handle default values consistently.
 *
 * @param inputValue - The input value provided for the field (may be undefined/null)
 * @param field - The field definition containing the default value
 * @param operation - The database operation being performed ('create' or 'update')
 * @returns The original value, or the default value if applicable
 */
export function applyFieldDefaultValue(
	inputValue: Primitive,
	field: Field,
	operation: 'create' | 'update'
): Primitive {
	if (operation === 'update') {
		return inputValue;
	}
	if ((inputValue === undefined || inputValue === null) && field.defaultValue) {
		if (typeof field.defaultValue === 'function') {
			return field.defaultValue();
		}
		return field.defaultValue;
	}
	return inputValue;
}

/**
 * Apply default values to data
 *
 * @param data The data object to apply defaults to
 * @param entityName The name of the entity
 * @param defaultValues The default values to apply
 * @returns The data with defaults applied
 */
export function applyEntityDefaults(
	data: Record<string, unknown>,
	entityName: string,
	defaultValues: Record<string, unknown> = {}
): Record<string, unknown> {
	const result = { ...data };

	// Apply default values for missing fields
	for (const [field, value] of Object.entries(defaultValues)) {
		if (result[field] === undefined) {
			result[field] = typeof value === 'function' ? value() : value;
		}
	}

	return result;
}

/**
 * Convert a regular filter object to a Where clause
 *
 * @param filter The filter object to convert
 * @returns The converted Where clause
 */
export function convertWhereToFilter<EntityType extends EntityName>(
	filter: Record<string, any>
): Where<EntityType> {
	const result: Where<EntityType> = [];

	// Convert each filter key-value pair to a where condition
	for (const [field, value] of Object.entries(filter)) {
		// Check for special operator fields
		if (field === '$and' || field === '$or') {
			const connector: LogicalConnector = field === '$and' ? 'AND' : 'OR';

			// Handle nested conditions for AND/OR
			if (Array.isArray(value)) {
				for (const subFilter of value) {
					const subConditions = convertWhereToFilter(subFilter);

					// Add the connector to each condition
					for (const condition of subConditions) {
						condition.connector = connector;
					}

					result.push(...subConditions);
				}
			}
			continue;
		}

		// Handle special operators
		let operator: ComparisonOperator = 'eq';
		let actualValue = value;

		// Check if the value is an object with operators
		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			const keys = Object.keys(value);
			if (keys.length === 1 && keys[0] && keys[0].startsWith('$')) {
				const op = keys[0].substring(1);
				const key = keys[0];
				actualValue = value[key];

				// Map operators
				switch (op) {
					case 'eq':
						operator = 'eq';
						break;
					case 'ne':
						operator = 'ne';
						break;
					case 'gt':
						operator = 'gt';
						break;
					case 'gte':
						operator = 'gte';
						break;
					case 'lt':
						operator = 'lt';
						break;
					case 'lte':
						operator = 'lte';
						break;
					case 'in':
						operator = 'in';
						break;
					case 'contains':
						operator = 'contains';
						break;
					case 'startsWith':
						operator = 'starts_with';
						break;
					case 'endsWith':
						operator = 'ends_with';
						break;
					case 'like':
						operator = 'ilike';
						break;
					default:
						operator = 'eq';
				}
			}
		}

		// Add the condition
		result.push({
			field: field as string,
			value: actualValue,
			operator,
			connector: 'AND',
		} as WhereCondition<EntityType>);
	}

	return result;
}

/**
 * Map sort options from a record to SortOptions
 *
 * @param model The model/entity name
 * @param sort The sort options as a record
 * @returns The converted SortOptions
 */
export function mapSortOptions<EntityType extends EntityName>(
	model: EntityType,
	sort: Record<string, 'asc' | 'desc'>
): SortOptions<EntityType> | undefined {
	const entries = Object.entries(sort);
	if (entries.length === 0) {
		return undefined;
	}

	// Get the first sort field (with safeguards)
	const entry = entries[0];
	if (!entry) {
		return undefined;
	}

	const [field, direction] = entry;

	return {
		field: field as string,
		direction,
	} as SortOptions<EntityType>;
}

/**
 * Generate a template adapter implementation
 *
 * This is useful for creating new adapters based on a common pattern.
 *
 * @returns A template adapter implementation
 */
export function createTemplateAdapter(id: string): Record<string, any> {
	return {
		id,

		async create(data: any) {
			console.log(`[${id}] Creating ${data.model} with data:`, data.data);
			return { id: 'mock-id', ...data.data };
		},

		async findOne(data: any) {
			console.log(`[${id}] Finding one ${data.model} with where:`, data.where);
			return null;
		},

		async findMany(data: any) {
			console.log(`[${id}] Finding many ${data.model} with where:`, data.where);
			return [];
		},

		async count(data: any) {
			return 0;
		},

		async update(data: any) {
			return null;
		},

		async updateMany(data: any) {
			return [];
		},

		async delete(data: any) {
			// No return needed
		},

		async deleteMany(data: any) {
			return 0;
		},

		async transaction(data: any) {
			return await data.callback(this);
		},

		async createSchema(options: any, file?: string) {
			return {
				code: `// ${id} schema\n// Generated at ${new Date().toISOString()}\n`,
				path: file || `./${id}-schema.ts`,
				overwrite: true,
			};
		},
	};
}
