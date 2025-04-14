import { createLogger } from '~/pkgs/logger';
import type { MigrationOperation } from './types';

/**
 * Creates functions to run or compile the generated migrations
 *
 * @param migrations - Migration operations to execute
 * @returns Object with runMigrations and compileMigrations functions
 */
export function createMigrationExecutors(migrations: MigrationOperation[]) {
  const logger = createLogger();

  /**
   * Executes all migration operations against the database
   *
   * This function runs each migration in sequence, executing the SQL operations
   * directly against the connected database. If any migration fails, the
   * process is halted with an error.
   *
   * @remarks
   * Migrations are executed in the order they were added to the migrations array.
   * Column additions are typically executed before table creations to ensure
   * any references between them are properly established.
   *
   * Error handling includes:
   * - Detailed logging of which migration failed
   * - Capturing the exact SQL that caused the error
   * - Rethrowing the error to allow callers to implement recovery strategies
   *
   * @throws Will throw the original database error with additional context
   *
   * @returns A promise that resolves when all migrations are complete
   *
   * @example
   * ```typescript
   * try {
   *   await runMigrations();
   *   console.log('All migrations completed successfully');
   * } catch (error) {
   *   console.error('Migration failed:', error);
   * }
   * ```
   */
  async function runMigrations() {
    // Loop through each migration operation in sequence
    for (const migration of migrations) {
      try {
        // Execute this migration against the database
        await migration.execute();
      } catch (error) {
        // If a migration fails, log the specific SQL that failed
        const sql = migration.compile().sql;
        logger.error(`Migration failed! SQL:\n${sql}`);

        // Rethrow the error to allow the caller to handle it
        throw error;
      }
    }
  }

  /**
   * Compiles all migrations to SQL without executing them
   *
   * @returns SQL string of all migrations
   */
  async function compileMigrations() {
    const compiled = migrations.map((m) => m.compile().sql);
    return `${compiled.join(';\n\n')};`;
  }

  return { runMigrations, compileMigrations };
}
