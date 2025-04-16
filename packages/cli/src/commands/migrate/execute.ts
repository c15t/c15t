import type { MigrationResult } from '@c15t/backend/pkgs/migrations';
import * as p from '@clack/prompts';
import type { CliContext } from '~/context/types';

/**
 * Executes the provided runMigrations function with spinner and error handling.
 */
export async function executeMigrations(
	context: CliContext,
	runMigrationsFn: MigrationResult['runMigrations']
): Promise<void> {
	const { logger } = context;
	logger.info('Executing migrations...');
	const s = p.spinner();
	s.start('Running migrations...');

	try {
		logger.debug('Calling runMigrations function...');
		await runMigrationsFn();
		logger.info('Migrations completed successfully.');
		s.stop('Migrations completed successfully!');
		logger.success('🚀 Database migrated successfully!');
		logger.failed('Migration complete.');
	} catch (error) {
		s.stop('Migration failed.');
		context.error.handleError(error, 'Error running migrations');
	}
}
