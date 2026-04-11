/**
 * Input validation utilities for the c15t CLI
 */

import { REGEX } from '../constants';

/**
 * Validate a URL string
 */
export function isValidUrl(value: string): boolean {
	return REGEX.URL.test(value);
}

/**
 * Validate a c15t platform URL
 */
export function isValidC15tUrl(value: string): boolean {
	return REGEX.C15T_URL.test(value);
}

/**
 * Validate a package name
 */
export function isValidPackageName(value: string): boolean {
	return REGEX.PACKAGE_NAME.test(value);
}

/**
 * Validate a semantic version
 */
export function isValidSemver(value: string): boolean {
	return REGEX.SEMVER.test(value);
}

/**
 * Check if a string contains a dynamic segment (e.g., [locale])
 */
export function hasDynamicSegment(value: string): boolean {
	return REGEX.DYNAMIC_SEGMENT.test(value);
}

/**
 * Extract dynamic segment from a path
 */
export function extractDynamicSegment(value: string): string | null {
	const match = value.match(REGEX.DYNAMIC_SEGMENT);
	return match ? match[0] : null;
}

/**
 * Validate an instance name
 */
export function isValidInstanceName(value: string): boolean {
	// Instance names: lowercase alphanumeric with hyphens, 3-63 chars
	return /^[a-z][a-z0-9-]{2,62}$/.test(value) && !value.includes('--');
}

/**
 * Validate an email address
 */
export function isValidEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Sanitize a string for use as an identifier
 */
export function sanitizeIdentifier(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * Validate that a value is not empty
 */
export function isNotEmpty(value: unknown): boolean {
	if (value === null || value === undefined) {
		return false;
	}
	if (typeof value === 'string') {
		return value.trim().length > 0;
	}
	if (Array.isArray(value)) {
		return value.length > 0;
	}
	if (typeof value === 'object') {
		return Object.keys(value).length > 0;
	}
	return true;
}

/**
 * Create a validator function for prompts
 */
export function createValidator(
	validate: (value: string) => boolean,
	errorMessage: string
): (value: string) => string | undefined {
	return (value: string) => {
		if (!validate(value)) {
			return errorMessage;
		}
		return undefined;
	};
}

/**
 * URL validator for prompts
 */
export const validateUrl = createValidator(
	isValidUrl,
	'Please enter a valid URL (e.g., https://example.com)'
);

/**
 * c15t URL validator for prompts
 */
export const validateC15tUrl = createValidator(
	isValidC15tUrl,
	'Please enter a valid c15t URL (e.g., https://my-app.c15t.dev)'
);

/**
 * Instance name validator for prompts
 */
export const validateInstanceName = createValidator(
	isValidInstanceName,
	'Project slug must be 3-63 lowercase alphanumeric characters with hyphens'
);

/**
 * Non-empty string validator for prompts
 */
export const validateRequired = createValidator(
	(value) => value.trim().length > 0,
	'This field is required'
);

/**
 * Normalize a URL (ensure https, remove trailing slash)
 */
export function normalizeUrl(url: string): string {
	let normalized = url.trim();

	// Add https if no protocol
	if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
		normalized = `https://${normalized}`;
	}

	// Upgrade http to https
	if (normalized.startsWith('http://')) {
		normalized = normalized.replace('http://', 'https://');
	}

	// Remove trailing slash
	normalized = normalized.replace(/\/+$/, '');

	return normalized;
}
