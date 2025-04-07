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
