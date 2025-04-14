/**
 * Database type enumeration
 * Used to identify the current database type for data handling decisions
 */
export type DatabaseType = 'sqlite' | 'postgresql' | 'mysql' | 'unknown';

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
