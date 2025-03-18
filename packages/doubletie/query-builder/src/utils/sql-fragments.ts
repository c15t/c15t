/**
 * SQL Fragment Utilities for Kysely 0.27.2+
 * @module utils/sql-fragments
 */

import { type Kysely, sql } from 'kysely';

/**
 * Create a SQL fragment with a subquery that uses INSERT
 * Fully supported in Kysely 0.27.2+
 *
 * @param db - Database instance
 * @param userData - Array of user data to insert
 * @returns SQL fragment containing the insert operation
 *
 * @example
 * ```ts
 * // Use in a raw query
 * const result = await db.executeQuery(sql`
 *   SELECT * FROM users
 *   WHERE id IN (${insertAndReturnUserIds(db, newUsers)})
 * `);
 * ```
 */
export function insertAndReturnUserIds<TData extends Record<string, any>>(
	db: Kysely<any>,
	userData: TData[]
) {
	// Kysely 0.27.2 fixes type issues with Kysely<any> for insert queries
	return sql`(
    ${db.insertInto('users').values(userData).returning('id')}
  )`;
}

/**
 * Create a SQL fragment with a nested UPDATE in a WHERE clause
 * Fully supported in Kysely 0.27.2+
 *
 * @param db - Database instance
 * @param userId - ID of the user to update
 * @param userData - Data to update the user with
 * @returns SQL fragment containing the update operation
 */
export function updateUserAndGetAuditClause<TData extends Record<string, any>>(
	db: Kysely<any>,
	userId: number,
	userData: TData
) {
	// Kysely 0.27.2 fixes type issues with Kysely<any> for update queries
	return sql`(
    ${db
			.updateTable('users')
			.set(userData)
			.where('id', '=', userId)
			.returning('id')}
    IS NOT NULL
  )`;
}

/**
 * Create a SQL fragment with a nested DELETE operation
 * Fully supported in Kysely 0.27.2+
 *
 * @param db - Database instance
 * @returns SQL fragment containing the delete operation
 */
export function deleteInactiveUsersAndCount(db: Kysely<any>) {
	return sql`(
    SELECT COUNT(*) FROM (
      ${db.deleteFrom('users').where('status', '=', 'inactive').returning('id')}
    ) as deleted_users
  )`;
}
