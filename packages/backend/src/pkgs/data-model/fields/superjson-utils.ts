import superjson from 'superjson';

/**
 * Database type enumeration
 * Used to identify the current database type for data handling decisions
 */
export type DatabaseType = 'sqlite' | 'postgresql' | 'mysql' | 'unknown';

/**
 * Get the current database type from a provider string
 *
 * @param provider - The database provider string
 * @returns The normalized database type
 */
export function normalizeDatabaseType(provider?: string): DatabaseType {
	if (!provider) {
		return 'unknown';
	}

	// Normalize provider names
	switch (provider.toLowerCase()) {
		case 'pg':
		case 'postgres':
		case 'postgresql':
			return 'postgresql';
		case 'mysql':
		case 'mariadb':
			return 'mysql';
		case 'sqlite':
		case 'sqlite3':
			return 'sqlite';
		default:
			return 'unknown';
	}
}

// Global database type setting that can be configured at startup
const currentDatabaseType: DatabaseType = 'unknown';

/**
 * Get the current database type
 *
 * @returns The current database type
 */
export function getDatabaseType(): DatabaseType {
	return currentDatabaseType;
}

/**
 * Apply database-specific transformations for JSON data
 *
 * @param value - The value to transform
 * @param dbType - The database type (defaults to current global setting)
 * @returns Transformed value appropriate for the database
 */
export function transformForDb<T>(
	value: T,
	dbType: DatabaseType = currentDatabaseType
): T | string {
	// For SQLite, always use SuperJSON
	if (dbType === 'sqlite') {
		return superjson.stringify(value);
	}

	// For MySQL, use SuperJSON for complex types
	if (dbType === 'mysql') {
		// Check if value contains complex types
		const containsComplexTypes = containsComplexJsTypes(value);

		if (containsComplexTypes) {
			return superjson.stringify(value);
		}
	}

	// For PostgreSQL, use native JSON
	return value;
}

/**
 * Parse a value from the database using the global database type.
 *
 * @param value - The value from the database
 * @returns Parsed value
 */
export function parseFromDb(value: unknown) {
	// If the value is a string and might be SuperJSON format
	if (typeof value === 'string' && isSuperJsonString(value)) {
		try {
			return superjson.parse(value);
		} catch {
			// If parsing fails, return the original value
			return value;
		}
	}

	return value;
}

/**
 * Check if a string looks like it might be in SuperJSON format
 *
 * @param str - The string to check
 * @returns Whether the string appears to be SuperJSON
 */
function isSuperJsonString(str: string): boolean {
	try {
		const parsed = JSON.parse(str);
		// SuperJSON format has 'json' and 'meta' properties
		return (
			typeof parsed === 'object' &&
			parsed !== null &&
			'json' in parsed &&
			'meta' in parsed
		);
	} catch {
		return false;
	}
}

/**
 * Check if a value contains complex JavaScript types
 * that might not be properly handled by standard JSON
 *
 * @param value - The value to check
 * @returns Whether the value contains complex types
 */
function containsComplexJsTypes(value: unknown): boolean {
	if (value === null || value === undefined) {
		return false;
	}

	// Check for Date, Map, Set, BigInt, or other non-standard JSON types
	if (
		value instanceof Date ||
		value instanceof Map ||
		value instanceof Set ||
		typeof value === 'bigint' ||
		ArrayBuffer.isView(value)
	) {
		return true;
	}

	// Recursively check objects and arrays
	if (Array.isArray(value)) {
		return value.some((item) => containsComplexJsTypes(item));
	}

	if (typeof value === 'object') {
		return Object.values(value as Record<string, unknown>).some((item) =>
			containsComplexJsTypes(item)
		);
	}

	return false;
}
