/**
 * String field utilities for entity schema definitions
 */
import { z } from 'zod';
import type { SchemaField } from '../schema.types';
import { createField } from './basic-fields';

export interface StringFieldOptions extends Partial<Omit<SchemaField, 'type'>> {
	/**
	 * Minimum length for the string
	 */
	minLength?: number;

	/**
	 * Maximum length for the string
	 */
	maxLength?: number;

	/**
	 * Pattern to validate the string against
	 */
	pattern?: RegExp;
}

/**
 * Creates a string field with configurable validation
 *
 * @param options Configuration options for the string field
 * @returns A schema field configured for string validation
 */
export function stringField(options?: StringFieldOptions): SchemaField {
	const { minLength, maxLength, pattern, ...rest } = options || {};

	// Build validator based on provided options
	let validator = z.string();

	if (minLength !== undefined) {
		validator = validator.min(minLength);
	}

	if (maxLength !== undefined) {
		validator = validator.max(maxLength);
	}

	if (pattern) {
		validator = validator.regex(pattern);
	}

	return createField('string', {
		validator,
		...rest,
	});
}

/**
 * Creates an email field with appropriate validation
 *
 * @param options Additional options for the email field
 * @returns A schema field configured for email validation
 *
 * @example
 * // Basic email field
 * emailField()
 */
export function emailField(
	options?: Omit<StringFieldOptions, 'pattern'>
): SchemaField {
	return stringField({
		validator: z.string().email(),
		...options,
	});
}

/**
 * Creates a timezone field with IANA timezone validation
 *
 * @param options Additional options for the timezone field
 * @returns A schema field configured for timezone validation
 *
 * @example
 * // Basic timezone field
 * timezoneField()
 */
export function timezoneField(
	options?: Omit<StringFieldOptions, 'pattern'>
): SchemaField {
	// This is a simplified timezone validation, could be more robust with a full IANA timezone list
	return stringField({
		validator: z.string().refine(
			(val) => {
				// Basic region/location pattern check
				const pattern =
					/^([A-Za-z_]+(?:\/[A-Za-z_]+)+)$|^(Etc\/GMT[+-][0-9]{1,2})$/;
				return pattern.test(val);
			},
			{
				message:
					"Must be a valid IANA timezone string (e.g., 'America/New_York', 'Europe/London')",
			}
		),
		...options,
	});
}

/**
 * Creates a URL field with appropriate validation
 *
 * @param options Additional options for the URL field
 * @returns A schema field configured for URL validation
 *
 * @example
 * // Basic URL field
 * urlField()
 */
export function urlField(
	options?: Omit<StringFieldOptions, 'pattern'>
): SchemaField {
	return stringField({
		validator: z.string().url(),
		...options,
	});
}

/**
 * Creates a slug field with appropriate format validation
 *
 * @param options Additional options for the slug field
 * @returns A schema field configured for slug validation
 *
 * @example
 * // Basic slug field
 * slugField()
 */
export function slugField(
	options?: Omit<StringFieldOptions, 'pattern'>
): SchemaField {
	return stringField({
		pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
		validator: z
			.string()
			.regex(
				/^[a-z0-9]+(?:-[a-z0-9]+)*$/,
				'Must be a valid slug (lowercase letters, numbers, and hyphens only, no consecutive hyphens)'
			),
		...options,
	});
}

/**
 * Creates a phone number field with basic validation
 *
 * @param options Additional options for the phone field
 * @returns A schema field configured for phone validation
 *
 * @example
 * // Basic phone field
 * phoneField()
 */
export function phoneField(
	options?: Omit<StringFieldOptions, 'pattern'>
): SchemaField {
	return stringField({
		validator: z
			.string()
			.regex(
				/^\+?[1-9]\d{1,14}$/,
				'Must be a valid phone number in E.164 format (e.g., +12125551234)'
			),
		...options,
	});
}
