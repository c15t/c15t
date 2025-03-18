/**
 * Timestamp field utilities for entity schema definitions
 */
import { z } from 'zod';
import type { FieldValueType, SchemaField } from '../schema.types';
import { createField } from './basic-fields';
import type {
	DatabaseHints,
	SQLiteTypeOption,
	StorageTypeCategory,
} from './field-hints';

/**
 * Format for storing timestamp data
 */
export type TimestampFormat =
	| 'iso' // ISO 8601 string (e.g., "2023-03-11T14:30:00.000Z")
	| 'unix' // UNIX timestamp in seconds (e.g., 1678546200)
	| 'unix_ms' // UNIX timestamp in milliseconds (e.g., 1678546200000)
	| 'date' // JavaScript Date object
	| 'custom'; // Custom format handled by transform functions

/**
 * Configuration for timestamp fields
 */
export interface TimestampFieldOptions
	extends Partial<Omit<SchemaField, 'type'>> {
	/**
	 * Whether to automatically set the timestamp on creation
	 * @default true
	 */
	autoCreate?: boolean;

	/**
	 * Whether to automatically update the timestamp on entity updates
	 * @default false for createdAt, true for updatedAt
	 */
	autoUpdate?: boolean;

	/**
	 * Format to store the timestamp in
	 * @default 'iso'
	 */
	format?: TimestampFormat;

	/**
	 * Custom format function for 'custom' format
	 */
	formatFn?: (date: Date) => unknown;

	/**
	 * Custom parse function for 'custom' format
	 */
	parseFn?: (value: unknown) => Date;

	/**
	 * Whether to store timezone information
	 * If true, the timestamp will include timezone offset or name
	 * @default false
	 */
	includeTimezone?: boolean;

	/**
	 * Timezone to use for timestamps
	 * If not provided, uses the system timezone
	 * Examples: 'UTC', 'America/New_York', etc.
	 */
	timezone?: string;

	/**
	 * Database-specific hints to override defaults
	 */
	databaseHints?: DatabaseHints;
}

/**
 * Creates a timestamp field with optional auto-creation/update and format options
 *
 * @param options Configuration options for the timestamp field
 * @returns A schema field configured for timestamps
 */
export function timestampField(
	options?: TimestampFieldOptions
): SchemaField<string, Date> {
	const {
		autoCreate = true,
		autoUpdate = false,
		format = 'iso',
		formatFn,
		parseFn,
		includeTimezone = false,
		timezone,
		databaseHints: customHints,
		...rest
	} = options || {};

	// Create validator based on format
	let validator;
	switch (format) {
		case 'iso':
			validator = z.string().datetime();
			break;
		case 'unix':
			validator = z.number().int().min(0);
			break;
		case 'unix_ms':
			validator = z.number().int().min(0);
			break;
		case 'date':
			validator = z.instanceof(Date);
			break;
		case 'custom':
			validator = formatFn && parseFn ? z.any() : z.string().datetime();
			break;
		default:
			validator = z.string().datetime();
	}

	// Input transform to handle auto-creation/update and format conversion
	const inputTransform = (value: unknown): FieldValueType => {
		// If value is explicitly provided, convert it to the desired format
		if (value !== undefined) {
			return formatTimestamp(value, {
				format,
				formatFn,
				timezone,
				includeTimezone,
			}) as FieldValueType;
		}

		// For auto-create/update fields, generate a current timestamp
		if ((autoCreate && !autoUpdate) || autoUpdate) {
			return formatTimestamp(new Date(), {
				format,
				formatFn,
				timezone,
				includeTimezone,
			}) as FieldValueType;
		}

		// No auto-create/update and no explicit value
		return undefined;
	};

	// Output transform to parse the stored format back to a Date
	const outputTransform = (value: unknown): FieldValueType => {
		// Skip null/undefined values
		if (value === null || value === undefined) {
			return value as FieldValueType;
		}

		try {
			// Parse the timestamp value
			return parseTimestamp(value, {
				format,
				parseFn,
				timezone,
			}) as FieldValueType;
		} catch (error) {
			// If parsing fails, return the original value
			return value as FieldValueType;
		}
	};

	// Generate appropriate database hints
	let storageType: StorageTypeCategory;
	let sqliteType: SQLiteTypeOption;
	let mysqlType: string;
	let postgresType: string;

	switch (format) {
		case 'unix':
			storageType = 'numeric' as const;
			sqliteType = 'INTEGER' as const;
			mysqlType = 'BIGINT';
			postgresType = 'BIGINT';
			break;
		case 'unix_ms':
			storageType = 'numeric' as const;
			sqliteType = 'INTEGER' as const;
			mysqlType = 'BIGINT';
			postgresType = 'BIGINT';
			break;
		case 'date':
			storageType = 'text' as const;
			sqliteType = 'TEXT' as const;
			mysqlType = 'VARCHAR(255)';
			postgresType = 'VARCHAR(255)';
			break;
		case 'iso':
		default:
			storageType = 'temporal' as const;
			sqliteType = 'TEXT' as const; // SQLite doesn't have a native timestamp type
			mysqlType = 'TIMESTAMP';
			postgresType = includeTimezone ? 'TIMESTAMPTZ' : 'TIMESTAMP';
			break;
	}

	// Database hints for timestamp fields
	const databaseHints: DatabaseHints = {
		storageType: storageType as StorageTypeCategory,
		indexed: autoCreate || autoUpdate, // Index created_at and updated_at by default
		sqlite: {
			type: sqliteType as SQLiteTypeOption,
		},
		mysql: {
			type: mysqlType,
		},
		postgres: {
			type: postgresType,
		},

		// Custom database hints to override defaults
		...customHints,
	};

	// Determine field type based on format
	let fieldType: string;
	switch (format) {
		case 'unix':
		case 'unix_ms':
			fieldType = 'number';
			break;
		case 'date':
			fieldType = 'date';
			break;
		case 'iso':
		case 'custom':
		default:
			fieldType = 'timestamp';
			break;
	}

	return createField(fieldType as any, {
		required: autoCreate,
		defaultValue: autoCreate ? () => new Date() : undefined,
		validator,
		transform: {
			input: inputTransform,
			output: outputTransform,
		},
		databaseHints,
		...rest,
	}) as SchemaField<string, Date>;
}

/**
 * Formats a timestamp value according to specified options
 */
function formatTimestamp(
	value: unknown,
	options: {
		format: TimestampFormat;
		formatFn?: (date: Date) => unknown;
		timezone?: string;
		includeTimezone?: boolean;
	}
): unknown {
	const { format, formatFn, timezone, includeTimezone } = options;

	// Convert input to a Date object
	let date: Date;
	if (value instanceof Date) {
		date = value;
	} else if (typeof value === 'number') {
		// Assume unix timestamp (seconds or ms)
		date = new Date(value > 9999999999 ? value : value * 1000);
	} else if (typeof value === 'string') {
		date = new Date(value);
	} else {
		// For null, undefined or invalid types, return as is
		return value;
	}

	// Apply timezone if specified
	if (timezone) {
		try {
			// Convert to a date in the specified timezone
			const options: Intl.DateTimeFormatOptions = {
				timeZone: timezone,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				hour12: false,
			};

			if (includeTimezone) {
				options.timeZoneName = 'short';
			}

			// Create a formatter for the timezone
			const formatter = new Intl.DateTimeFormat('en-US', options);

			// For 'iso' format with timezone, use toLocaleString to preserve TZ info
			if (format === 'iso' && includeTimezone) {
				return formatter.format(date);
			}

			// For other formats, just adjust the time but keep the format
			const parts = formatter.formatToParts(date);
			const dateObj: Record<string, string> = {};
			parts.forEach((part) => {
				if (part.type !== 'literal') {
					dateObj[part.type] = part.value;
				}
			});

			// Reconstruct a date in the target timezone
			const newDate = new Date(
				Number(dateObj.year),
				Number(dateObj.month) - 1,
				Number(dateObj.day),
				Number(dateObj.hour),
				Number(dateObj.minute),
				Number(dateObj.second)
			);

			date = newDate;
		} catch (e) {
			console.warn(`Invalid timezone: ${timezone}, using system timezone`);
		}
	}

	// Format based on specified format
	switch (format) {
		case 'iso':
			return date.toISOString();
		case 'unix':
			return Math.floor(date.getTime() / 1000);
		case 'unix_ms':
			return date.getTime();
		case 'date':
			return date;
		case 'custom':
			return formatFn ? formatFn(date) : date.toISOString();
		default:
			return date.toISOString();
	}
}

/**
 * Parses a timestamp value from storage format to a Date object
 */
function parseTimestamp(
	value: unknown,
	options: {
		format: TimestampFormat;
		parseFn?: (value: unknown) => Date;
		timezone?: string;
	}
): Date | string {
	const { format, parseFn, timezone } = options;

	if (value === null || value === undefined) {
		return value as any;
	}

	// Convert from storage format to Date
	let date: Date;
	switch (format) {
		case 'iso':
			date = new Date(value as string);
			break;
		case 'unix':
			date = new Date((value as number) * 1000);
			break;
		case 'unix_ms':
			date = new Date(value as number);
			break;
		case 'date':
			date = value as Date;
			break;
		case 'custom':
			date = parseFn ? parseFn(value) : new Date(value as any);
			break;
		default:
			date = new Date(value as any);
	}

	// Apply timezone if specified
	if (timezone) {
		try {
			// Convert to a date in the specified timezone
			const options: Intl.DateTimeFormatOptions = {
				timeZone: timezone,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				hour12: false,
			};

			// Create a formatter for the timezone
			const formatter = new Intl.DateTimeFormat('en-US', options);

			// For 'iso' format with timezone, use toLocaleString to preserve TZ info
			if (format === 'iso') {
				return formatter.format(date);
			}

			// For other formats, just adjust the time but keep the format
			const parts = formatter.formatToParts(date);
			const dateObj: Record<string, string> = {};
			parts.forEach((part) => {
				if (part.type !== 'literal') {
					dateObj[part.type] = part.value;
				}
			});

			// Reconstruct a date in the target timezone
			const newDate = new Date(
				Number(dateObj.year),
				Number(dateObj.month) - 1,
				Number(dateObj.day),
				Number(dateObj.hour),
				Number(dateObj.minute),
				Number(dateObj.second)
			);

			date = newDate;
		} catch (e) {
			console.warn(`Invalid timezone: ${timezone}, using system timezone`);
		}
	}

	// Return ISO string for consistency in application layer
	return date;
}

/**
 * Creates a createdAt timestamp field that auto-sets on creation
 *
 * @param options Additional options for the timestamp field
 * @returns A schema field configured for tracking creation time
 *
 * @example
 * // Basic ISO createdAt field
 * createdAtField()
 *
 * @example
 * // Unix timestamp createdAt field
 * createdAtField({ format: 'unix' })
 */
export function createdAtField(
	options?: Omit<TimestampFieldOptions, 'autoCreate' | 'autoUpdate'>
): SchemaField<string, Date> {
	return timestampField({
		autoCreate: true,
		autoUpdate: false,
		description: 'Timestamp when the record was created',
		...options,
	});
}

/**
 * Creates an updatedAt timestamp field that auto-updates on entity updates
 *
 * @param options Additional options for the timestamp field
 * @returns A schema field configured for tracking update time
 *
 * @example
 * // Basic ISO updatedAt field
 * updatedAtField()
 *
 * @example
 * // Unix timestamp updatedAt with timezone
 * updatedAtField({ format: 'unix', timezone: 'UTC' })
 */
export function updatedAtField(
	options?: Omit<TimestampFieldOptions, 'autoCreate' | 'autoUpdate'>
): SchemaField<string, Date> {
	return timestampField({
		autoCreate: true,
		autoUpdate: true,
		description: 'Timestamp when the record was last updated',
		...options,
	});
}

/**
 * Creates a deletedAt timestamp field for soft deletes
 *
 * @param options Additional options for the timestamp field
 * @returns A schema field configured for tracking deletion time
 *
 * @example
 * // Basic ISO deletedAt field
 * deletedAtField()
 *
 * @example
 * // Unix timestamp deletedAt field
 * deletedAtField({ format: 'unix' })
 */
export function deletedAtField(
	options?: Omit<TimestampFieldOptions, 'autoCreate' | 'autoUpdate'>
): SchemaField<string, Date> {
	return timestampField({
		autoCreate: false,
		autoUpdate: false,
		required: false,
		description: 'Timestamp when the record was soft-deleted',
		...options,
	});
}

/**
 * Creates an expiresAt timestamp field for content that expires
 *
 * @param options Additional options for the timestamp field
 * @returns A schema field configured for expiration time
 *
 * @example
 * // Token that expires in 24 hours
 * expiresAtField({ defaultValue: () => new Date(Date.now() + 24 * 60 * 60 * 1000) })
 */
export function expiresAtField(
	options?: Omit<TimestampFieldOptions, 'autoCreate' | 'autoUpdate'>
): SchemaField<string, Date> {
	return timestampField({
		autoCreate: false,
		autoUpdate: false,
		required: false,
		description: 'Timestamp when the record expires',
		...options,
	});
}
