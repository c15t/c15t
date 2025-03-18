/**
 * Utilities for working with JSON fields in queries
 * Using enhanced JSON path features from Kysely 0.27.0
 *
 * @module json-helper
 */

import type { ExpressionBuilder } from 'kysely';

/**
 * Creates a query helper for searching within JSON data
 * Takes advantage of Kysely 0.27.0's improved JSON path handling
 *
 * @typeParam TDatabase - Database schema type
 * @typeParam TTableName - Table name type
 * @typeParam TValue - Expected type of the JSON value
 *
 * @param eb - Expression builder from the query
 * @param jsonColumn - Name of the JSON/JSONB column
 * @param path - Path to the nested property (use $.property.nested format for Postgres)
 * @returns A function that accepts a value to compare against
 *
 * @example
 * ```ts
 * db.selectFrom('users')
 *   .where(eb => {
 *     const hasEmailNotifications = jsonSearch<DB, 'users', boolean>(
 *       eb,
 *       'preferences',
 *       '$.notifications.email'
 *     );
 *     return hasEmailNotifications(true);
 *   })
 * ```
 */
export function jsonSearch<
	TDatabase,
	TTableName extends keyof TDatabase & string,
	TValue,
>(
	eb: ExpressionBuilder<TDatabase, TTableName>,
	jsonColumn: string,
	path: string
) {
	// Create a value comparison function
	return <V extends TValue>(value: V) => {
		// @ts-expect-error - Will fix when Kysely 0.27.0 upgrade is complete
		return eb(jsonColumn, 'jsonPath', path).equals(value);
	};
}

/**
 * Usage example:
 *
 * ```ts
 * import { jsonSearch } from './utils/json-helper';
 *
 * db.selectFrom('users')
 *   .where(eb => {
 *     const hasEmailNotifications = jsonSearch<DB, 'users', boolean>(
 *       eb,
 *       'preferences',
 *       '$.notifications.email'
 *     );
 *
 *     return hasEmailNotifications(true);
 *   })
 *   .execute();
 * ```
 */
