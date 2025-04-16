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
		await runMigrationsFn();
		s.stop('Migrations completed successfully!');
		logger.success('🚀 Database migrated successfully');
	} catch (error) {
		logger.error('Migration failed.');
		context.error.handleError(error, 'Error running migrations');
	}
}
