import superjson from 'superjson';
import type { InferValueType } from './field-inference';
import type {
	Field,
	FieldConfig,
	FieldType,
	JsonValue,
	Primitive,
} from './field-types';
import {
	getDatabaseType,
	parseFromDb,
	transformForDb,
} from './superjson-utils';
import { validateField } from './zod-fields';

/**
 * Defines transform functions for field input and output operations.
 * Provides properly typed transform functions based on the field type.
 *
 * @template TFieldType - The field type that determines the transform function signatures
 *
 * @example
 * ```typescript
 * // Define transform functions for a string field
 * const nameTransformers: FieldTransformers<'string'> = {
 *   input: (value) => value.trim(),
 *   output: (value) => value.toUpperCase()
 * };
 * ```
 */
export type FieldTransformers<TFieldType extends FieldType> = {
	/**
	 * Transform function for field input.
	 * Applied when data is being saved to the database.
	 */
	input?: (value: InferValueType<TFieldType>) => Primitive | Promise<Primitive>;
	/**
	 * Transform function for field output.
	 * Applied when data is being retrieved from the database.
	 */
	output?: (
		value: InferValueType<TFieldType>
	) => Primitive | Promise<Primitive>;
};

/**
 * Configuration options specific to number fields.
 * Provides additional validation options for number fields.
 *
 * @example
 * ```typescript
 * // Define a number field with min/max constraints
 * const ageField = numberField({
 *   required: true,
 *   min: 0,
 *   max: 120
 * });
 * ```
 */
export type NumberFieldOptions = {
	/**
	 * Minimum allowed value for the number field.
	 */
	min?: number;
	/**
	 * Maximum allowed value for the number field.
	 */
	max?: number;
};

/**
 * Configuration options specific to string fields.
 * Provides additional validation options for string fields.
 *
 * @example
 * ```typescript
 * // Define a string field with length constraints
 * const usernameField = stringField({
 *   required: true,
 *   minLength: 3,
 *   maxLength: 20
 * });
 * ```
 */
export type StringFieldOptions = {
	/**
	 * Minimum allowed length for the string field.
	 */
	minLength?: number;
	/**
	 * Maximum allowed length for the string field.
	 */
	maxLength?: number;
	/**
	 * Regular expression pattern that the string must match.
	 */
	pattern?: string;
};

/**
 * Configuration options specific to date fields.
 * Provides additional validation and formatting options for date fields.
 *
 * @example
 * ```typescript
 * // Define a date field with min/max date constraints
 * const birthdateField = dateField({
 *   required: true,
 *   minDate: new Date('1900-01-01'),
 *   maxDate: new Date() // Current date
 * });
 * ```
 */
export type DateFieldOptions = {
	/**
	 * Minimum allowed date value.
	 * Dates earlier than this will fail validation.
	 */
	minDate?: Date;

	/**
	 * Maximum allowed date value.
	 * Dates later than this will fail validation.
	 */
	maxDate?: Date;

	/**
	 * Whether to store just the date part without time information.
	 * When true, time components will be zeroed out.
	 * @default false
	 */
	dateOnly?: boolean;

	/**
	 * Format string for date output transformation.
	 * If provided, dates will be transformed to strings in this format.
	 * Only applies if no custom output transform is provided.
	 * Uses Intl.DateTimeFormat for consistent cross-platform formatting.
	 */
	format?: Intl.DateTimeFormatOptions;
};

/**
 * Configuration options specific to JSON fields.
 * Provides additional validation and schema options for JSON data.
 *
 * @example
 * ```typescript
 * // Define a JSON field with schema validation
 * const metadataField = jsonField({
 *   required: true,
 *   validator: (value) => {
 *     if (!value.hasOwnProperty('version')) return 'Missing version property';
 *     return null;
 *   }
 * });
 * ```
 */
export type JsonFieldOptions = {
	/**
	 * Whether to validate that the value is a valid JSON object.
	 * When true, the field will ensure the value can be properly stringified/parsed.
	 * @default true
	 */
	validateJson?: boolean;
};

/**
 * Common IANA timezone identifiers.
 * A subset of commonly used timezones from the IANA timezone database.
 * Used for validation and autocompletion in IDE.
 */
export const COMMON_TIMEZONES = {
	UTC: 'UTC',
	GMT: 'GMT',
	// North America
	EASTERN: 'America/New_York',
	CENTRAL: 'America/Chicago',
	MOUNTAIN: 'America/Denver',
	PACIFIC: 'America/Los_Angeles',
	// Europe
	LONDON: 'Europe/London',
	PARIS: 'Europe/Paris',
	BERLIN: 'Europe/Berlin',
	// Asia
	TOKYO: 'Asia/Tokyo',
	SHANGHAI: 'Asia/Shanghai',
	SINGAPORE: 'Asia/Singapore',
	// Australia
	SYDNEY: 'Australia/Sydney',
	// South America
	SAO_PAULO: 'America/Sao_Paulo',
} as const;

/**
 * Configuration options specific to timezone fields.
 * Provides additional validation options for timezone fields.
 *
 * @example
 * ```typescript
 * // Define a timezone field with validation
 * const tzField = timezoneField({
 *   required: true,
 *   defaultValue: COMMON_TIMEZONES.UTC
 * });
 *
 * // Define a timezone field with suggested values
 * const subjectTimezone = timezoneField({
 *   required: true,
 *   suggestedValues: [
 *     COMMON_TIMEZONES.EASTERN,
 *     COMMON_TIMEZONES.CENTRAL,
 *     COMMON_TIMEZONES.PACIFIC
 *   ]
 * });
 * ```
 *
 * @remarks
 * The timezone field stores timezone identifiers according to the IANA timezone database.
 * It validates timezone strings to ensure they are valid IANA timezone identifiers.
 */
export type TimezoneFieldOptions = {
	/**
	 * Whether to validate the timezone format against IANA timezone database.
	 * When true, ensures the value is a valid IANA timezone name.
	 * @default true
	 */
	validateTimezone?: boolean;

	/**
	 * Suggested values for the timezone field.
	 * Can be used by client UIs to provide dropdown options.
	 */
	suggestedValues?: string[] | readonly string[];

	/**
	 * Whether to restrict values to only the provided suggestedValues.
	 * If true, values not in suggestedValues will fail validation.
	 * @default false
	 */
	restrictToSuggestedValues?: boolean;
};

/**
 * Creates a field attribute with the specified configuration.
 * This is the core function for defining schema fields with type safety.
 *
 * @template TFieldType - The field type to create
 * @template TConfig - The configuration type for the field
 *
 * @param type - The field type to create
 * @param config - Configuration options for the field
 * @returns A fully configured field definition
 *
 * @example
 * ```typescript
 * // Create a basic string field
 * const nameField = createField('string', {
 *   required: true
 * });
 *
 * // Create a number field with transforms
 * const ageField = createField('number', {
 *   required: false,
 *   transform: {
 *     input: (value) => Math.floor(value)
 *   }
 * });
 * ```
 */
export function createField<TFieldType extends FieldType>(
	type: TFieldType,
	config?: Omit<FieldConfig<TFieldType>, 'type'>
): Field<TFieldType> {
	const fieldConfig: FieldConfig<TFieldType> = {
		type,
		required: true,
		returned: true,
		input: true,
		sortable: true,
		bigint: false,
		...config,
	};

	return validateField(fieldConfig);
}

/**
 * Creates a string field with the specified configuration.
 */
export function stringField<
	TConfig extends Omit<FieldConfig<'string'>, 'type' | 'transform'> & {
		transform?: {
			input?: (value: string) => Primitive | Promise<Primitive>;
			output?: (value: unknown) => string | Promise<string>;
		};
	} & StringFieldOptions,
>(config: TConfig = {} as TConfig): Field<'string'> {
	return createField('string', config);
}

/**
 * Creates a number field with the specified configuration.
 */
export function numberField<
	TConfig extends Omit<FieldConfig<'number'>, 'type' | 'transform'> & {
		transform?: {
			input?: (value: number) => Primitive | Promise<Primitive>;
			output?: (value: unknown) => number | Promise<number>;
		};
	} & NumberFieldOptions,
>(config: TConfig = {} as TConfig): Field<'number'> {
	return createField('number', config);
}

/**
 * Creates a boolean field with the specified configuration.
 */
export function booleanField<
	TConfig extends Omit<FieldConfig<'boolean'>, 'type' | 'transform'> & {
		transform?: {
			input?: (value: boolean) => Primitive | Promise<Primitive>;
			output?: (value: unknown) => boolean | Promise<boolean>;
		};
	},
>(config: TConfig = {} as TConfig): Field<'boolean'> {
	return createField('boolean', config);
}

/**
 * Creates a date field with the specified configuration.
 */
export function dateField<
	TConfig extends Omit<
		FieldConfig<'date'>,
		'type' | 'transform' | 'minDate' | 'maxDate' | 'dateOnly' | 'format'
	> & {
		transform?: {
			input?: (value: Date) => Primitive | Promise<Primitive>;
			output?: (value: unknown) => Date | Promise<Date>;
		};
	} & DateFieldOptions,
>(config: TConfig = {} as TConfig): Field<'date'> {
	const {
		transform = {},
		minDate,
		maxDate,
		dateOnly = false,
		format,
		validator,
		...restConfig
	} = config;

	// Store the original transform functions
	const originalInputTransform = transform.input;
	const originalOutputTransform = transform.output;

	// Get the current database type
	const dbType = getDatabaseType();

	// Create database-aware transform functions for SQLite and MySQL
	const inputTransform = async (value: Date) => {
		// First apply the subject's transform if provided
		let transformedValue = value;
		if (originalInputTransform) {
			transformedValue = (await originalInputTransform(value)) as Date;
		}

		// Strip time components if dateOnly is true
		if (dateOnly && transformedValue instanceof Date) {
			const dateOnlyValue = new Date(transformedValue);
			dateOnlyValue.setHours(0, 0, 0, 0);
			transformedValue = dateOnlyValue;
		}

		// Apply special handling for SQLite (and optionally MySQL) to preserve timezone info
		if (dbType === 'sqlite') {
			return superjson.stringify({ date: transformedValue });
		}

		return transformedValue;
	};

	const outputTransform = async (value: unknown): Promise<Date> => {
		let parsedValue = value;

		// Handle SQLite date format (SuperJSON string)
		if (
			dbType === 'sqlite' &&
			typeof value === 'string' &&
			value.includes('"date"')
		) {
			try {
				const parsed = superjson.parse(value);
				parsedValue = (parsed as { date: Date }).date;
			} catch {
				// If parsing fails, keep the original value
			}
		}

		// Apply the subject's transform if provided
		if (originalOutputTransform && parsedValue instanceof Date) {
			return await originalOutputTransform(parsedValue);
		}
		// Apply formatting if no custom transform was provided and format is specified
		if (!originalOutputTransform && format && parsedValue instanceof Date) {
			return new Date(
				new Intl.DateTimeFormat(undefined, format).format(parsedValue)
			);
		}

		return parsedValue as Date;
	};

	// Create a validator for min/max date constraints
	let dateValidator = validator;
	if ((minDate || maxDate) && !dateValidator) {
		dateValidator = (value: Date) => {
			if (!(value instanceof Date)) {
				return 'Value must be a Date object';
			}

			if (minDate && value < minDate) {
				return `Date must not be earlier than ${minDate.toISOString()}`;
			}

			if (maxDate && value > maxDate) {
				return `Date must not be later than ${maxDate.toISOString()}`;
			}

			return null;
		};
	}
	// If there's already a validator and min/max constraints, chain them
	else if (
		(minDate || maxDate) &&
		dateValidator &&
		typeof dateValidator === 'function'
	) {
		const originalValidator = dateValidator;
		dateValidator = (value: Date) => {
			if (!(value instanceof Date)) {
				return 'Value must be a Date object';
			}

			// Check min/max constraints
			if (minDate && value < minDate) {
				return `Date must not be earlier than ${minDate.toISOString()}`;
			}

			if (maxDate && value > maxDate) {
				return `Date must not be later than ${maxDate.toISOString()}`;
			}

			// Run the original validator
			return originalValidator(value);
		};
	}

	return createField('date', {
		...restConfig,
		transform: {
			input: inputTransform,
			output: outputTransform,
		},
		validator: dateValidator,
	});
}

/**
 * Creates a timezone field with the specified configuration.
 * Convenience wrapper around createField with timezone type.
 *
 * @template TConfig - The configuration type for the field
 *
 * @param config - Configuration options for the field
 * @returns A fully configured timezone field definition
 *
 * @example
 * ```typescript
 * // Create a required timezone field with a default value
 * const timezoneField = {
 *   timezone: timezoneField({
 *     required: true,
 *     defaultValue: COMMON_TIMEZONES.UTC
 *   })
 * };
 *
 * // Create a timezone field with restricted values
 * const regionTimezone = timezoneField({
 *   required: true,
 *   suggestedValues: [
 *     COMMON_TIMEZONES.EASTERN,
 *     COMMON_TIMEZONES.CENTRAL,
 *     COMMON_TIMEZONES.MOUNTAIN,
 *     COMMON_TIMEZONES.PACIFIC
 *   ],
 *   restrictToSuggestedValues: true
 * });
 * ```
 *
 * @remarks
 * The timezone field stores timezone identifiers according to the IANA timezone database.
 * It validates timezone strings to ensure they are valid IANA timezone identifiers.
 */
export function timezoneField<
	TConfig extends Omit<FieldConfig<'timezone'>, 'type' | 'transform'> & {
		transform?: {
			input?: (value: string) => string | Promise<string>;
			output?: (value: unknown) => string | Promise<string>;
		};
	} & TimezoneFieldOptions,
>(config: TConfig = {} as TConfig): Field<'timezone'> {
	const {
		validateTimezone = true,
		suggestedValues,
		restrictToSuggestedValues = false,
		transform = {},
		...restConfig
	} = config;

	// Store the original transform functions
	const originalInputTransform = transform.input;
	const originalOutputTransform = transform.output;

	// Create a validator for timezone format if validation is enabled
	const validateIANATimezone = (timezone: string): string | null => {
		// If we're restricting to suggested values, check that first
		if (restrictToSuggestedValues && suggestedValues) {
			if (!suggestedValues.includes(timezone)) {
				return `Timezone must be one of the suggested values: ${suggestedValues.join(', ')}`;
			}
			// If it's in the suggested values, we can skip the Intl validation
			return null;
		}

		try {
			// Use Intl.DateTimeFormat to validate the timezone
			Intl.DateTimeFormat(undefined, { timeZone: timezone });
			return null;
		} catch {
			return 'Invalid timezone identifier. Must be a valid IANA timezone.';
		}
	};

	// Custom input transform that applies validation if enabled
	const inputTransform = async (value: string): Promise<string> => {
		// First apply the subject's transform if provided
		let transformedValue = value;
		if (originalInputTransform) {
			transformedValue = await originalInputTransform(value);
		}

		return transformedValue;
	};

	// Output transform
	const outputTransform = async (value: unknown): Promise<string> => {
		let parsedValue = value;

		// Then apply the subject's transform if provided
		if (originalOutputTransform && typeof parsedValue === 'string') {
			parsedValue = await originalOutputTransform(parsedValue);
		}

		return parsedValue as string;
	};

	// Create the validator function
	const validator = validateTimezone
		? (value: string) => {
				if (value === null || value === undefined) {
					return null;
				}
				return validateIANATimezone(value);
			}
		: config.validator;

	return createField('timezone', {
		...restConfig,
		transform: {
			input: inputTransform,
			output: outputTransform,
		},
		validator,
	});
}

/**
 * Creates a string array field with the specified configuration.
 */
export function stringArrayField<
	TConfig extends Omit<FieldConfig<'string[]'>, 'type' | 'transform'> & {
		transform?: {
			input?: (value: string[]) => Primitive | Promise<Primitive>;
			output?: (value: unknown) => string[] | Promise<string[]>;
		};
	},
>(config: TConfig = {} as TConfig): Field<'string[]'> {
	return createField('string[]', config);
}

/**
 * Creates a number array field with the specified configuration.
 */
export function numberArrayField<
	TConfig extends Omit<FieldConfig<'number[]'>, 'type' | 'transform'> & {
		transform?: {
			input?: (value: number[]) => Primitive | Promise<Primitive>;
			output?: (value: unknown) => number[] | Promise<number[]>;
		};
	},
>(config: TConfig = {} as TConfig): Field<'number[]'> {
	return createField('number[]', config);
}

/**
 * Creates a JSON field with the specified configuration.
 */
export function jsonField<
	TConfig extends Omit<FieldConfig<'json'>, 'type' | 'transform'> & {
		transform?: {
			input?: (value: JsonValue) => Primitive | Promise<Primitive>;
			output?: (value: unknown) => JsonValue | Promise<JsonValue>;
		};
	} & JsonFieldOptions,
>(config: TConfig = {} as TConfig): Field<'json'> {
	const { validateJson = true, transform = {}, ...restConfig } = config;

	// Store the original transform functions
	const originalInputTransform = transform.input;
	const originalOutputTransform = transform.output;

	// Create database-aware transform functions
	const inputTransform = async (value: JsonValue): Promise<Primitive> => {
		// First apply the subject's transform if provided
		let transformedValue = value;
		if (originalInputTransform) {
			const result = await originalInputTransform(value);
			if (result === undefined || result === null) {
				throw new Error('Transform returned invalid value');
			}
			transformedValue = result instanceof Date ? result.toISOString() : result;
		}

		// Then apply database-specific serialization
		if (
			typeof transformedValue !== 'string' &&
			typeof transformedValue !== 'number' &&
			typeof transformedValue !== 'boolean'
		) {
			throw new Error('Invalid primitive value');
		}
		const isPrimitive = (value: unknown): value is Primitive =>
			typeof value === 'string' ||
			typeof value === 'number' ||
			typeof value === 'boolean';

		if (!isPrimitive(transformedValue)) {
			throw new Error('Invalid primitive value');
		}
		return transformForDb(transformedValue);
	};

	const outputTransform = async (value: unknown): Promise<JsonValue> => {
		// First parse from database format
		let parsedValue = parseFromDb(value);

		// Then apply the subject's transform if provided
		if (
			originalOutputTransform &&
			typeof parsedValue === 'object' &&
			parsedValue !== null
		) {
			parsedValue = await originalOutputTransform(parsedValue);
		}

		return parsedValue as JsonValue;
	};

	let jsonValidator = config.validator;

	// If validateJson is true and no validator is specified, add JSON validation
	if (validateJson && !jsonValidator) {
		jsonValidator = (value: JsonValue) => {
			try {
				superjson.stringify(value);
				return null;
			} catch (error) {
				return `Invalid JSON structure: ${(error as Error).message}`;
			}
		};
	}
	// If validateJson is true and there's an existing validator, chain them
	else if (validateJson && jsonValidator) {
		const originalValidator = jsonValidator;
		jsonValidator = (value: JsonValue) => {
			try {
				superjson.stringify(value);
				if (typeof originalValidator === 'function') {
					return originalValidator(value);
				}
				return null;
			} catch (error) {
				return `Invalid JSON structure: ${(error as Error).message}`;
			}
		};
	}

	return createField('json', {
		...restConfig,
		validator: jsonValidator,
		transform: {
			input: inputTransform,
			output: outputTransform,
		},
	});
}

/**
 * Utility functions for working with dates and timezones.
 * Provides helper methods for common date and timezone operations.
 */
export const DateTimeUtils = {
	/**
	 * Creates a Date object in a specific timezone.
	 *
	 * @param dateInput - Date object or ISO string to convert
	 * @param timezone - Target timezone (IANA timezone identifier)
	 * @returns Date object adjusted for the specified timezone
	 */
	createDateInTimezone: (dateInput: Date | string, timezone: string): Date => {
		const date =
			typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput);

		// Get the target timezone's current offset from UTC
		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			timeZoneName: 'short',
		});

		// Format the date in the target timezone to get correct representation
		const formattedDate = formatter.format(date);
		return new Date(formattedDate);
	},

	/**
	 * Formats a date according to the specified timezone.
	 *
	 * @param date - The date to format
	 * @param timezone - Target timezone (IANA timezone identifier)
	 * @param options - Formatting options for Intl.DateTimeFormat
	 * @returns Formatted date string in the specified timezone
	 */
	formatInTimezone: (
		date: Date,
		timezone: string,
		options: Intl.DateTimeFormatOptions = {
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric',
			timeZoneName: 'short',
		}
	): string => {
		return new Intl.DateTimeFormat('en-US', {
			...options,
			timeZone: timezone,
		}).format(date);
	},

	/**
	 * Gets the current date in a specific timezone.
	 *
	 * @param timezone - Target timezone (IANA timezone identifier)
	 * @returns Current date adjusted for the specified timezone
	 */
	getNowInTimezone: (timezone: string): Date => {
		return DateTimeUtils.createDateInTimezone(new Date(), timezone);
	},

	/**
	 * Calculates the offset in minutes between the local timezone and the specified timezone.
	 *
	 * @param timezone - Target timezone (IANA timezone identifier)
	 * @param date - Optional date to calculate the offset for (defaults to current date)
	 * @returns Offset in minutes between local and specified timezone
	 */
	getTimezoneOffset: (timezone: string, date: Date = new Date()): number => {
		// Calculate the client's timezone offset in minutes
		const localOffset = date.getTimezoneOffset();

		// Get the target timezone offset
		const targetDate = new Date(
			date.toLocaleString('en-US', { timeZone: timezone })
		);
		const targetOffset = (date.getTime() - targetDate.getTime()) / 60000;

		return localOffset - targetOffset;
	},
};
